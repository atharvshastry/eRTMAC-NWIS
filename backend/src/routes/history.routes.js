const pool = require("../config/db");

async function historyRoutes(app) {

  app.get("/api/wells/:wellId/history", async (request, reply) => {
    try {
      const { wellId } = request.params;

      // 1. Get well information
      const wellResult = await pool.query(
        `
        SELECT
          well_id,
          well_name,
          field,
          asset,
          rig_name,
          spud_date,
          rig_release_date,
          surface_lat,
          surface_lon,
          planned_td_m,
          actual_td_m,
          well_type,
          well_status
        FROM wells
        WHERE well_id = $1
        `,
        [wellId]
      );

      if (wellResult.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "Well not found"
        });
      }

      // 2. Get formations
      const formationResult = await pool.query(
        `
        SELECT
          formation,
          top_md_m,
          base_md_m,
          lithology,
          reservoir_quality_index,
          formation_risk
        FROM formations
        WHERE well_id = $1
        ORDER BY top_md_m
        `,
        [wellId]
      );

      // 3. Get historical events
      const eventResult = await pool.query(
        `
        SELECT
          event_id,
          event_type,
          severity,
          depth_md_m,
          depth_tvd_m,
          start_time,
          end_time,
          formation,
          description,
          mitigation,
          npt_hours,
          record_status
        FROM operational_events
        WHERE well_id = $1
        ORDER BY depth_md_m
        `,
        [wellId]
      );

      // 4. Get mud records
      const mudResult = await pool.query(
        `
        SELECT *
        FROM mud_report
        WHERE well_id = $1
        `,
        [wellId]
      );

      // 5. Get casing and cement records
      const casingResult = await pool.query(
        `
        SELECT *
        FROM casing_cement
        WHERE well_id = $1
        `,
        [wellId]
      );

      return {
        success: true,

        well: wellResult.rows[0],

        formations: {
          count: formationResult.rows.length,
          records: formationResult.rows
        },

        events: {
          count: eventResult.rows.length,
          records: eventResult.rows
        },

        mudReports: {
          count: mudResult.rows.length,
          records: mudResult.rows
        },

        casingCement: {
          count: casingResult.rows.length,
          records: casingResult.rows
        }
      };

    } catch (error) {
      console.error(error);

      return reply.code(500).send({
        success: false,
        message: "Failed to fetch well history"
      });
    }
  });

}

module.exports = historyRoutes;
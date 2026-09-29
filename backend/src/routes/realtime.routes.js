const pool = require("../config/db");
const { checkRealtimeAlert } = require("../services/alert.service");

async function realtimeRoutes(app) {

  app.get("/api/realtime/:wellId/latest", async (request, reply) => {
    try {
      const { wellId } = request.params;

      const result = await pool.query(
        `
        SELECT
          timestamp,
          well_id,
          CAST(md_m AS DOUBLE PRECISION) AS md_m,
          CAST(tvd_m AS DOUBLE PRECISION) AS tvd_m,
          formation,
          activity_phase,
          CAST(rop_m_hr AS DOUBLE PRECISION) AS rop_m_hr,
          CAST(wob_klbf AS DOUBLE PRECISION) AS wob_klbf,
          CAST(rpm AS DOUBLE PRECISION) AS rpm,
          CAST(torque_knm AS DOUBLE PRECISION) AS torque_knm,
          CAST(spp_kpa AS DOUBLE PRECISION) AS spp_kpa,
          CAST(hookload_kn AS DOUBLE PRECISION) AS hookload_kn,
          CAST(flow_in_lpm AS DOUBLE PRECISION) AS flow_in_lpm
        FROM ertmac_realtime
        WHERE well_id = $1
        ORDER BY timestamp DESC
        LIMIT 1
        `,
        [wellId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: "No realtime data found for this well"
        });
      }

      await checkRealtimeAlert(wellId);

      return {
        success: true,
        wellId: wellId,
        realtime: result.rows[0]
      };

    } catch (error) {
      console.error(error);

      return reply.code(500).send({
        success: false,
        message: "Failed to fetch realtime drilling data"
      });
    }
  });

}

module.exports = realtimeRoutes;

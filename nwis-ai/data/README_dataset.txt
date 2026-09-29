PS 26121 – eRTMAC-NWIS Synthetic Dataset

IMPORTANT: This is a synthetic research/demo dataset. It is NOT OIL proprietary data and does not claim to reproduce any confidential schema.
It is designed to align closely with the publicly described OIL eRTMAC / drilling-data ecosystem and the PS 26121 requirements.

PUBLIC OIL DESIGN BASIS USED:
1) OIL states eRTMAC captures real-time drilling data and critical well data for command-center monitoring.
2) OIL tender documentation states historical drilling data is stored in WITSML.
3) OIL tender documentation references OpenWells for daily operations data and offset-well based analysis.
4) OIL documentation references WITSML/LAS/ASCII/CSV inputs, PDF images, BHA/bit performance, mud recap, cementing reports, well complications and well completion reports.

SYNTHETIC SCALE:
- 19 wells (18 historical offsets + 1 active well)
- 3,100 eRTMAC telemetry rows
- 118 DDR records
- 19 WCR summaries
- 54 historical events/incidents
- 95 mud-report records
- 57 casing/cement records
- 39 BHA/bit records
- 263 trajectory survey stations

INTENDED ML TARGETS:
- mud loss risk
- stuck pipe risk
- kick / influx risk
- torque spike risk
- cementing issue risk
- NPT risk

RECOMMENDED PIPELINE:
WCR/DDR PDFs + telemetry -> OCR -> NLP/entity/event extraction -> structured store -> offset-well retrieval -> depth/formation correlation -> risk model -> real-time alert.
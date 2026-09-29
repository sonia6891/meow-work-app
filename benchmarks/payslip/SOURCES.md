# Payslip Blind Benchmark Sources

This benchmark must not use real employee payslips containing personal data.

## Public sources used as schema/layout inspiration

1. **buthaya/payslips** — MIT license. 611 annotated payslip pages (text + layout, no original images). Used only as a public document-understanding/layout reference.
   - https://github.com/buthaya/payslips
2. **AnujSureshkumar/synthetic-finance-data** — MIT license. Synthetic payroll generator/data. Used as a public synthetic payroll reference.
   - https://github.com/AnujSureshkumar/synthetic-finance-data
3. **puneet-mehta/free-payslip-generator** — MIT license. Public payslip generator used as one layout-family reference.
   - https://github.com/puneet-mehta/free-payslip-generator
4. **paalamugan/employee-payslip-generator** — MIT license. Public payslip generator used as another layout-family reference.
   - https://github.com/paalamugan/employee-payslip-generator
5. Taiwan Ministry of Labor salary-detail requirements are used only to define Taiwan field categories; no government document image is copied into the benchmark.

## Excluded sources

- Real employee payslips scraped from search results, GitHub, forums, or social media.
- Any file containing real names, addresses, bank accounts, employee IDs, tax IDs, or other personal data.
- Commercial/request-only datasets unless the project later obtains an explicit license.

## Benchmark construction

- 5,000 deterministic synthetic documents.
- Cases 0–3999: tune/development split.
- Cases 4000–4999: locked holdout split.
- Holdout uses layout families not used by the tune split.
- Ground truth is generated before rendering and is therefore exact by construction.
- Image degradations include blur, JPEG compression, low contrast, skew, shadow, downscale/upscale, and light noise.
- Critical numeric confusions are intentionally oversampled: 8/9, 3/8, 5/6, 1/7, missing leading digit, and adjacent-column leakage.
- Unknown income/deduction rows are intentionally included so extraItems recall can be measured.

The holdout score must be reported separately from the tune score. Known regression cases (97, 1300, 650, 859) are never counted as evidence of generalization.

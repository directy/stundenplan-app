use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Holiday {
    pub id: i64,
    pub school_year: String,
    pub state: String,
    pub name: String,
    pub start_date: String,
    pub end_date: String,
    pub created_at: String,
}

/// Struktur fuer den JSON-Import einer einzelnen Ferienperiode
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HolidayPeriod {
    pub name: String,
    pub start_date: String,
    pub end_date: String,
}

/// Struktur fuer die gesamte Ferien-JSON-Datei
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HolidayImportData {
    pub school_year: String,
    pub state: String,
    pub holidays: Vec<HolidayPeriod>,
}

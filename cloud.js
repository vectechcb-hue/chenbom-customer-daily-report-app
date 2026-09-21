export async function loadCloudConfig(){return null;}
export async function configureCloud(){throw new Error('雲端記憶需要在瀏覽器版 App 使用');}
export async function syncReport(){return false;}
export async function loadReportsFromCloud(){return {};}
export async function saveExportRecord(){return false;}
export async function loadExportRecordsFromCloud(){return [];}
export async function hasCloudConfig(){return false;}

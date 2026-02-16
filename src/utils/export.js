import * as XLSX from 'xlsx'

/**
 * Export data to Excel
 * @param {Array} data - Array of objects to export
 * @param {String} fileName - Name of the file (without extension)
 * @param {Object} [headerMap] - Optional map to rename headers { apiKey: 'Display Name' }
 */
export const exportToExcel = (data, fileName = 'export', headerMap = null) => {
  if (!data || !data.length) {
    console.warn('No data to export')
    return
  }

  // Map data if headerMap is provided
  let exportData = data
  if (headerMap) {
    exportData = data.map(item => {
      const mappedItem = {}
      Object.keys(headerMap).forEach(key => {
        // Handle nested properties (e.g., 'user.name')
        const value = key.split('.').reduce((obj, i) => (obj ? obj[i] : null), item)
        mappedItem[headerMap[key]] = value ?? ''
      })
      return mappedItem
    })
  }

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData)

  // Create workbook and add the worksheet
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

  // Generate date string for unique filename
  const dateStr = new Date().toISOString().split('T')[0]
  const fullFileName = `${fileName}_${dateStr}.xlsx`

  // Download the file
  XLSX.writeFile(workbook, fullFileName)
}

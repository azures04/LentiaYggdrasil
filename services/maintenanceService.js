const database = require("../modules/database")

async function cleanupCertificates() {
    const now = new Date().toISOString()
    const result = database.deleteExpiredCertificates(now)
    if (result.code === 200 && result.deletedCount > 0) {
        console.log(`[Maintenance] Cleaned up ${result.deletedCount} expired certificates.`)
    }
    
    return result
}

module.exports = {
    cleanupCertificates
}
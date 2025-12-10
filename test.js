const fs = require("fs/promises")
const path = require("path")

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function scanDirectoryRecursive(dir) {
    let blackList = ["node_modules", ".git", ".github", "dist", "package-lock.json", "package.json", "data", "logs"]
    let allowedExtensions = [".js", ".html", ".css", ".md", ".json"]
    let results = []

    try {
        const entries = await fs.readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)

            if (entry.isDirectory()) {
                if (blackList.includes(entry.name)) {
                    continue
                } else {
                    const subDirResults = await scanDirectoryRecursive(fullPath)
                    results = results.concat(subDirResults)
                }
            } else {
                const fileExtension = path.parse(fullPath).ext
                if (allowedExtensions.includes(fileExtension)) {
                    if (!blackList.includes(entry.name)) {
                        results.push(fullPath)
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Erreur lors du scan de ${dir}:`, error)
    }

    return results
}

async function countLinesAndChars(files) {
    let totalLines = 0
    let totalChars = 0
    const fileStats = []

    for (const file of files) {
        try {
            const content = await fs.readFile(file, "utf8")
            const lines = content.split("\n").length
            const chars = content.length

            totalLines += lines
            totalChars += chars

            fileStats.push({ file, lines, chars })
        } catch (error) {
            console.error(`Erreur lors de la lecture de ${file}:`, error)
        }
    }

    return { totalLines, totalChars, fileStats }
}

(async () => {
    const directoryPath = "./"
    const allFiles = await scanDirectoryRecursive(directoryPath)
    const stats = await countLinesAndChars(allFiles)
    console.log("Statistiques globales:", stats)
})()

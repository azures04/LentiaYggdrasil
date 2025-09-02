const fs = require("node:fs")
const path = require("node:path")
const config = require("../config.json")
require("colors")

class Logger {

    constructor(root) {
        this.root = root

        if (config.isProd) {
            this.TIMESTAMP = new Date().toLocaleString("fr-FR", { timeZone: "UTC" }).replace(/\//g, "-").replace(/:/g, "-").replace(/ /g, "_")
        } else {
            this.TIMESTAMP = "DEV-LOG"
        }

        if (!fs.existsSync(path.join(this.root, "logs"))) {
            fs.mkdirSync(path.join(this.root, "logs"))
        }
    }

    log(content) {
        if (typeof content == "object") {
            content = JSON.stringify(content)
        } else if (typeof content == "function") {
            content = content.toString()
        }
        console.log(`[${new Date().toISOString()}] `.magenta + "[" + "INFO".green + "] " + content)
        fs.appendFileSync(path.join(this.root, "logs", this.TIMESTAMP + ".log"), `[${new Date().toISOString()}] [INFO]` + content + "\r\n")
    }

    error(content) {
        if (typeof content == "object") {
            content = JSON.stringify(content)
        } else if (typeof content == "function") {
            content = content.toString()
        }
        console.log(`[${new Date().toISOString()}] `.magenta + "[" + "ERROR".red + "] " + content)
        fs.appendFileSync(path.join(this.root, "logs", this.TIMESTAMP + ".log"), `[${new Date().toISOString()}] [ERROR]` + content + "\r\n")
    }

    warn(content) {
        if (typeof content == "object") {
            content = JSON.stringify(content)
        } else if (typeof content == "function") {
            content = content.toString()
        }
        console.log(`[${new Date().toISOString()}] `.magenta + "[" + "WARN".yellow + "] " + content)
        fs.appendFileSync(path.join(this.root, "logs", this.TIMESTAMP + ".log"), `[${new Date().toISOString()}] [WARN]` + content + "\r\n")
    }

    debug(content) {
        if (typeof content == "object") {
            content = JSON.stringify(content)
        } else if (typeof content == "function") {
            content = content.toString()
        }
        console.log(`[${new Date().toISOString()}] `.magenta + "[" + "DEBUG".white + "] " + content)
        fs.appendFileSync(path.join(this.root, "logs", this.TIMESTAMP + ".log"), `[${new Date().toISOString()}] [DEBUG]` + content + "\r\n")
    }

}

module.exports = Logger
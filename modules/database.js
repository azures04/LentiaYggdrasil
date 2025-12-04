const path = require("node:path")
const utils = require("./utils")
const config = require("../config.json")
const Logger = require("./logger")
const crypto = require("node:crypto")
const bcrypt = require("bcryptjs")
const logger = new Logger(path.join(__dirname, ".."))
const Databse = require("better-sqlite3")
const databse = new Databse(path.join(__dirname, "..", "data", "database.db"))

async function main() {
    databse.exec(`
        CREATE TABLE IF NOT EXISTS players (
            email TEXT NULL,
            username VARCHAR(${utils.getMinMaxFromRegex(config.players.usernameRegex).max}) NOT NULL,
            password TEXT NOT NULL,
            uuid VARCHAR(36) NOT NULL    
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "players".bold + " table created or is already existing"),
    databse.exec(`
        CREATE TABLE IF NOT EXISTS clientSessions (
            accessToken TEXT NOT NULL,
            clientToken VARCHAR(36) NOT NULL
        )
    `)
    logger.log("[" + "MySQL".yellow + "] " + "clientSessions".bold + " table created or is already existing")
}

async function register(email = "", username, password) {
    try {
        const sql = `INSERT INTO players (email, username, password, uuid) VALUES (?, ?, ?, ?)`
        const statement = databse.prepare(sql)
        const uuid = crypto.randomBytes(16)
        const hashedPassword = await bcrypt.hash(password, config.players.passwordsSalt)
        const result = statement.run(email, username, hashedPassword, uuid)
        if (result.changes > 0) {
            return { code: 200, email, username, uuid }
        } else {
            return { code: 500, message: "Internal Server Error", error: "Unknown" }
        }
    } catch (error) {
        return { code: 500, message: "Internal Server Error", error: error.toString() }
    }
}

module.exports = {
    register
}
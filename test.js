const database = require("./modules/database")
const certsManager = require("./modules/certsManager")
const userService = require("./services/userService")

async function main() {
    const toLog = certsManager.getKeys() 
    console.log(toLog)
}

main()
require("colors")
const fs = require("node:fs")
const path = require("node:path")
const routes = fs.readdirSync(path.join(__dirname, "routes"), { recursive: true })
const database = require("./modules/database")
const certsManager = require("./modules/certsManager")
const config = require("./config.json")
const express = require("express")
const app = express()
const Logger = require("./modules/logger")
const logger = new Logger(__dirname)
const rateLimit = require("express-rate-limit")

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 600,
    standardHeaders: true,
	legacyHeaders: false,
})

app.use(limiter)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

database.setup()
certsManager.setupKeys()

for (let route of routes) {
    if (route.endsWith(".js")) {
        if (route.endsWith("index.js")) {
            route = "/" + route.replace("index.js", "/").replace(/\\/g, "/").replace(/\/\//g, "")
        } else {
            route = "/" + route.replace(".js", "").replace(/\\/g, "/")
        }
        const routeHandler = require(`./routes/${route}`)
        if (routeHandler.stack) {
            for (const stack of routeHandler.stack) {
                if (stack.route?.methods) {
                    logger.log(`${Object.keys(stack.route.methods).join("").toUpperCase().cyan} ${route.cyan.bold + stack.route.path.cyan.bold} route registered`)
                }
            }
        }
        app.use(route, routeHandler)
    }
}

app.listen(config.web.port, () => {
    logger.log("[" + `WEB`.yellow + "] Server listening at port : " + config.web.port)
})
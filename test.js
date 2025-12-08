const database = require("./modules/database")
const userService = require("./services/userService")

async function main() {
    const user = await userService.getUser({ identifier: "d31974c9-040e-49be-9743-7a2f5143da56" })
    console.log(user)
}

main()
const database = require("./modules/database")

async function main() {
    const properties = await database.getPlayerProperties("81dbd296-5a0c-4518-92c6-6b62572d7b5a")
    console.log(properties)
}

main()
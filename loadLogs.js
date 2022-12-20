const { Parser } = require('json2csv');
const { loadAllLogs } = require("./DAL/databaseApi");
const fs = require('fs');

async function main() {
    var logs = await loadAllLogs();

    const fields = ['guildId', 'timestamp', 'userId', 'username'];
    const opts = { fields };
    
    try {
        const parser = new Parser(opts);
        const csv = parser.parse(logs);
    
        console.log(logs.length);
    
        fs.writeFile("logs.csv", csv, function (err,data) {
            if (err) {
              return console.log(err);
            }
            console.log(data);
          });
      } catch (err) {
        console.error(err);
      }
}


main();
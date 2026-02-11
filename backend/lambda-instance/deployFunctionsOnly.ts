// import fs from 'fs'
// import yaml from 'js-yaml'
// import cp from 'child_process'

// export const deployFunctionsOnly = async () => {
//   const serverlessYAML = yaml.load(fs.readFileSync('./serverless.yml', 'utf8'));

//   const timeStart = new Date().getTime()

//   for await (const functionName of Object.keys(serverlessYAML.functions)) {

//     const command = "npx sls deploy function --function " + functionName + ` --aws-profile ${process.env.PROFILE}`

//     await new Promise((resolve, reject) => {
//       console.log('deploying ' + functionName)
//       cp.exec(command, (error, stdout, stderr) => {
//         console.log(stdout)
//         resolve(true)
//       })
//     })
//   }

//   const elapsedTimeInSeconds = (new Date().getTime() - timeStart) / 1000
//   console.log('deploy done in ' + elapsedTimeInSeconds + ' seconds')
// }

// (async () => {
//   await deployFunctionsOnly()
// })()
import request, { gql } from 'graphql-request';

export const performanceTest = async () => {

  let document = gql`
    query($first: Int, $filter: PositionFilter, $orderBy: [PositionsOrderBy!]) {
      positions(first: $first, filter: $filter, orderBy: $orderBy) {
          nodes {
            id
            executedBlockTime
          }
      }
    }
  `

  const result: any = await Promise.all([
    new Promise(async (resolve) => {

      let previousResult0 = 0

      while(true) {

        const data: any = await request(
          "http://localhost:3111/graphql",
          document,
          {
            first: 1,
            orderBy: "EXECUTED_BLOCK_TIME_DESC",
          }
        )

        await new Promise((resolve) => setTimeout(resolve, 100))
        if (previousResult0 && (data.positions.nodes[0].executedBlockTime != previousResult0)) {
          console.log('own node resolved')
          return resolve(new Date().getTime())
        }

        previousResult0 = data.positions.nodes[0].executedBlockTime
      }
    }),
    new Promise(async (resolve) => {

      let previousResult1 = 0

      while(true) {

        const data: any = await request(
          "http://18.180.226.130:3111",
          document,
          {
            first: 1,
            orderBy: "EXECUTED_BLOCK_TIME_DESC",
          }
        )

        await new Promise((resolve) => setTimeout(resolve, 100))
        if (previousResult1 && (data.positions.nodes[0].executedBlockTime != previousResult1)) {
          console.log('subql(local node) resolved')
          return resolve(new Date().getTime())
        }

        previousResult1 = data.positions.nodes[0].executedBlockTime
      }
    })
  ])

  console.log(`own node: ${result[0]}`)
  console.log(`subql(local node): ${result[1]}`)
  console.log('diff: ', (result[1] - result[0]) / 1000, 's')

  await performanceTest()
}

(async () => {
  await performanceTest()
})()
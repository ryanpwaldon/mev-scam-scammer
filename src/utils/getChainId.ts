export default () => {
  return {
    mainnet: 1,
    rinkeby: 4,
    goerli: 5,
  }[process.env.NETWORK as string] as number
}

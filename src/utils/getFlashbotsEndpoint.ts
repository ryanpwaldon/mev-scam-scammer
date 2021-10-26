export default () => {
  return {
    mainnet: 'https://relay.flashbots.net',
    rinkeby: 'https://relay-rinkeby.flashbots.net',
    goerli: 'https://relay-goerli.flashbots.net',
  }[process.env.NETWORK as string]
}

export const formatIpfsUrl = ipfsUrl => {
  if (ipfsUrl?.indexOf('ipfs://') === 0) {
    return ipfsUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')
  }
  return ipfsUrl
}

export const getIpfs = async ipfsUrl => {
  const uri = formatIpfsUrl(ipfsUrl)
  const data = await fetch(uri)
  return data.json()
}

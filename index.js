import { createLibp2p } from 'libp2p';
import { createFromJSON } from "@libp2p/peer-id-factory";
import {CID} from "multiformats";
import { LevelDatastore } from 'datastore-level';
import * as libp2pInfo from 'libp2p/version';
import * as os from "node:os";
// Transport
import { webRTC, webRTCDirect } from '@libp2p/webrtc';
import { webSockets } from "@libp2p/websockets";
import { tcp } from "@libp2p/tcp";
// Encryption
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { mplex } from '@libp2p/mplex';
// Peer Discovery
import { bootstrap } from '@libp2p/bootstrap';
// Services
import { autoNAT } from '@libp2p/autonat'
import { dcutr } from '@libp2p/dcutr'
import { ping } from '@libp2p/ping'
import { uPnPNAT } from '@libp2p/upnp-nat'
import { identify } from '@libp2p/identify'
import { kadDHT, removePrivateAddressesMapper } from '@libp2p/kad-dht'

const PEER_ID_JSON = JSON.parse(process.env.PEER_ID_JSON);
const peerId = await createFromJSON(PEER_ID_JSON);

const datastore = new LevelDatastore('test.db');
await datastore.open();

const node = await createLibp2p({
    peerId,
    datastore,
    transports: [tcp(), webSockets(), webRTC(), webRTCDirect()],
    peerDiscovery: [
        bootstrap({
            list: [
                "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
                "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
                "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
                "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
                "/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ"
            ],
        }),
    ],
    services: {
        autoNAT: autoNAT(),
        dcutr: dcutr(),
        dht: kadDHT({
            clientMode: false,
            peerInfoMapper: removePrivateAddressesMapper
        }),
        identify: identify({
            agentVersion: `cre-24/1 ${libp2pInfo.name}/${libp2pInfo.version} UserAgent=${globalThis.process.version}`
        }),
        ping: ping(),
        upnp: uPnPNAT()
    },
    connectionEncryption: [noise()],
    streamMuxers: [yamux(), mplex()],
    peerStore: {
        persistence: true,
        threshold: 5
    },
    connectionManager: {
        autoDial: true
    },
    nat: {
        enabled: true,
        description: `ipfs@${os.hostname()}`
    },
});

const listenAddrs = node.getMultiaddrs()
console.log('libp2p is listening on the following addresses: ', listenAddrs)


async function provideContent() {
    await node.services.dht.refreshRoutingTable()
    const parsedCid = CID.parse("bafkreibnuocb5hzms2uw5b5lezvdjdsjadzztn2eoded5pujfjbdgbixky")
    await node.contentRouting.provide(parsedCid)
    console.log(`provided ${parsedCid} with peer id ${peerId}`)
}

setTimeout(provideContent, 10 * 60 * 1000)

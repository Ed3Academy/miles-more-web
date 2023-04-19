import { ConnectButton } from "@rainbow-me/rainbowkit";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import ABI_GATE from "../abi/AirlineGate.json";
import ABI_TICKET from "../abi/TicketNft.json";
import ABI_POINT from "../abi/LoyaltyPoints.json";
import ABI_COUPON from "../abi/Coupon.json";
import { Card, Row, Col, Button, Typography, Modal, Spin, message } from "antd";
import {
  useAccount,
  useContractRead,
  useBalance,
  usePrepareContractWrite,
  useContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { formatBigNumber } from "../util";
import { useState, useEffect } from "react";
import {
  prepareWriteContract,
  writeContract,
  waitForTransaction,
  readContract,
} from "@wagmi/core";
import { getIpfs, formatIpfsUrl } from "../ipfs";

const { Title } = Typography;

const GATE_ADDRESS = "0xBa147139813736Db98FBBb0567fF2A80D093D3e9";
const TICKET_ADDRESS = "0x8B939b4469BC384e841afE4d809D95F1373e81cF";
const POINT_ADDRESS = "0x0F4638eC264C25d6fBe59e66A9F3Cf0672B6DABF";
const COUPON_ADDRESS = "0x5bb8CcE2A46ab36970d10cD4087B7D172337FbFa";

const Home = () => {
  const [mounted, setMounted] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nftList, setNftList] = useState([]);
  const [ticketNftList, setTicketNftList] = useState([]);
  const [isLoadingNft, setIsLoadingNft] = useState(false);
  const [isLoadingTicketNft, setIsLoadingTicketNft] = useState(false);

  const { address } = useAccount();

  const { data: userTickets, isLoading: isLoadingUserTickets } =
    useContractRead({
      address: TICKET_ADDRESS,
      abi: ABI_TICKET,
      functionName: "balanceOf",
      args: [address],
    });

  const { data: maxSupply, isLoading: isLoadingMaxSupply } = useContractRead({
    address: TICKET_ADDRESS,
    abi: ABI_TICKET,
    functionName: "maxSupply",
  });

  const { data: totalSupply, isLoading: isLoadingTotalSupply } =
    useContractRead({
      address: TICKET_ADDRESS,
      abi: ABI_TICKET,
      functionName: "totalSupply",
    });

  const { data: ticketPrice, isLoading: isLoadingTicketPrice } =
    useContractRead({
      address: TICKET_ADDRESS,
      abi: ABI_TICKET,
      functionName: "mintPrice",
    });

  const { data: balanceCoupon, isLoading: isLoadingCoupon } = useContractRead({
    address: COUPON_ADDRESS,
    abi: ABI_COUPON,
    functionName: "balanceOf",
    args: [address],
  });

  const {
    data: balancePoint,
    isLoading: isLoadingPoint,
    refetch: refetchBalancePoint,
  } = useBalance({
    address,
    token: POINT_ADDRESS,
  });

  // 购买机票，mint 积分
  const { config: configMint } = usePrepareContractWrite({
    address: GATE_ADDRESS,
    abi: ABI_GATE,
    functionName: "mint",
    args: [address],
    overrides: {
      value: ticketPrice,
    },
  });
  const {
    data: dataMint,
    isLoading: isLoadingMintStart,
    write: mint,
  } = useContractWrite(configMint);
  const { isLoading: isLoadingMint, isSuccess: isSuccessMint } =
    useWaitForTransaction({
      hash: dataMint?.hash,
    });

  const exchangeCoupon = async () => {
    setIsExchanging(true);
    const config = await prepareWriteContract({
      address: POINT_ADDRESS,
      abi: ABI_POINT,
      functionName: "approve",
      args: [COUPON_ADDRESS, 0],
    });
    const { hash } = await writeContract(config);
    await waitForTransaction({
      hash,
    });
    const config1 = await prepareWriteContract({
      address: POINT_ADDRESS,
      abi: ABI_POINT,
      functionName: "approve",
      args: [COUPON_ADDRESS, balancePoint.value],
    });
    const { hash: hash1 } = await writeContract(config1);
    await waitForTransaction({
      hash: hash1,
    });
    const config2 = await prepareWriteContract({
      address: COUPON_ADDRESS,
      abi: ABI_COUPON,
      functionName: "mint",
      args: [address],
    });
    const { hash: hash2 } = await writeContract(config2);
    await waitForTransaction({
      hash: hash2,
    });
    setIsExchanging(false);
    message.success("兑换成功");
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const openTicketDetail = async () => {
    setIsTicketModalOpen(true);
    setIsLoadingTicketNft(true);
    const ticketNum = Number(userTickets.toString());
    const readTokenId = [];
    for (let i = 0; i < ticketNum; i++) {
      readTokenId.push(
        readContract({
          address: TICKET_ADDRESS,
          abi: ABI_TICKET,
          functionName: "tokenOfOwnerByIndex",
          args: [address, i],
        })
      );
    }
    const tokenIds = await Promise.all(readTokenId);
    const ipfs = await readContract({
      address: TICKET_ADDRESS,
      abi: ABI_TICKET,
      functionName: "tokenURI",
      args: [0],
    });
    const metadata = await getIpfs(ipfs);
    const metadatas = tokenIds.map((el) => ({
      tokenId: el,
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
    }));
    console.log("metadatas", metadatas);
    setTicketNftList(metadatas);
    setIsLoadingTicketNft(false);
  };

  const openDetail = async () => {
    setIsModalOpen(true);
    setIsLoadingNft(true);
    const couponNum = Number(balanceCoupon.toString());
    const readTokenId = [];
    for (let i = 0; i < couponNum; i++) {
      readTokenId.push(
        readContract({
          address: COUPON_ADDRESS,
          abi: ABI_COUPON,
          functionName: "tokenOfOwnerByIndex",
          args: [address, i],
        })
      );
    }
    const tokenIds = await Promise.all(readTokenId);
    const ipfs = await readContract({
      address: COUPON_ADDRESS,
      abi: ABI_COUPON,
      functionName: "tokenURI",
      args: [0],
    });
    const metadata = await getIpfs(ipfs);
    const metadatas = tokenIds.map((el) => ({
      tokenId: el,
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
    }));
    console.log("metadatas", metadatas);
    setNftList(metadatas);
    setIsLoadingNft(false);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isSuccessMint) {
      return;
    }
    message.success("购买成功");
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, [isSuccessMint]);

  if (!mounted) {
    return;
  }

  return (
    <>
      <div className={styles.container}>
        <Head>
          <title>RainbowKit App</title>
          <meta
            content="Generated by @rainbow-me/create-rainbowkit"
            name="description"
          />
          <link href="/favicon.ico" rel="icon" />
        </Head>

        <main className={styles.main}>
          <Title>Ed3 Miles&More星享计划</Title>
          <ConnectButton />
          <div className={styles.info}>
            <Card style={{ width: 600 }}>
              <Row gutter={[20, 20]}>
                <Col span={24}>
                  <Card title="机票价格" loading={isLoadingTicketPrice}>
                    {ticketPrice && <p>{formatBigNumber(ticketPrice)} MATIC</p>}
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    title="已购机票"
                    loading={isLoadingUserTickets}
                    extra={
                      <span
                        className={styles.detail}
                        onClick={openTicketDetail}
                      >
                        详情
                      </span>
                    }
                  >
                    {userTickets && <p>{userTickets.toString()} 张</p>}
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    title="剩余机票"
                    loading={isLoadingMaxSupply || isLoadingTotalSupply}
                  >
                    {maxSupply && totalSupply && (
                      <p>
                        {Number(maxSupply.toString()) -
                          Number(totalSupply.toString())}{" "}
                        张
                      </p>
                    )}
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="我的积分" loading={isLoadingPoint}>
                    {balancePoint && <p>{balancePoint.value.toString()}</p>}
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    title="我的优惠券"
                    loading={isLoadingCoupon}
                    extra={
                      <span className={styles.detail} onClick={openDetail}>
                        详情
                      </span>
                    }
                  >
                    {balanceCoupon && <p>{balanceCoupon.toString()} 张</p>}
                  </Card>
                </Col>
                <Col span={24}>
                  <Button
                    type="primary"
                    block
                    loading={isLoadingMintStart || isLoadingMint}
                    onClick={() => mint?.()}
                  >
                    购买机票
                  </Button>
                </Col>
                <Col span={24}>
                  <Button block loading={isExchanging} onClick={exchangeCoupon}>
                    兑换优惠券
                  </Button>
                </Col>
              </Row>
            </Card>
          </div>
          <Modal
            title="我的机票"
            footer={null}
            open={isTicketModalOpen}
            onCancel={() => setIsTicketModalOpen(false)}
          >
            {isLoadingTicketNft && (
              <div className={styles.spin}>
                <Spin size="large" />
              </div>
            )}
            {!isLoadingTicketNft && (
              <Row gutter={[20, 20]}>
                {ticketNftList.map((nft) => (
                  <Col key={nft.tokenId} span={12}>
                    <Card
                      hoverable
                      cover={
                        <img
                          className={styles.cover}
                          src={formatIpfsUrl(nft.image)}
                          alt="NFT"
                        />
                      }
                    >
                      <Card.Meta
                        title={`${nft.name}#${nft.tokenId}`}
                        description={nft.description}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Modal>
          <Modal
            title="我的优惠券"
            footer={null}
            open={isModalOpen}
            onCancel={() => setIsModalOpen(false)}
          >
            {isLoadingNft && (
              <div className={styles.spin}>
                <Spin size="large" />
              </div>
            )}
            {!isLoadingNft && (
              <Row gutter={[20, 20]}>
                {nftList.map((nft) => (
                  <Col key={nft.tokenId} span={12}>
                    <Card
                      hoverable
                      cover={
                        <img
                          className={styles.cover}
                          src={formatIpfsUrl(nft.image)}
                          alt="NFT"
                        />
                      }
                    >
                      <Card.Meta
                        title={`${nft.name}#${nft.tokenId}`}
                        description={nft.description}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Modal>
        </main>

        <footer className={styles.footer}>
          <a
            href="https://rainbow.me"
            rel="noopener noreferrer"
            target="_blank"
          >
            Made with ❤️ by your frens at 🌈
          </a>
        </footer>
      </div>
    </>
  );
};

export default Home;

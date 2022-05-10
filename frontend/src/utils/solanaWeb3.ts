import * as solanaWeb3 from "@solana/web3.js";
import { getProvider } from "./getProvider";
import { fetchWallet } from "./fetcher";

const LAMPORTS_PER_SOL = solanaWeb3.LAMPORTS_PER_SOL;

// 랜딩페이지에서 지갑연결하여 해당 리턴값 반환
const getWallet = async () => {
  const provider = getProvider();

  // provider가 undefined면 팬텀지갑 공식홈페이지로 이동
  if (provider) {
    const response = await provider.connect();
    try {
      const res = await fetchWallet(response.publicKey.toString());
      if (res.status >= 200 && res.status < 400) {
        const data = await res.json();
        return data;
      } else {
        const error = new Error(res.statusText);
        throw error;
      }
    } catch (error) {
      console.log(error);
      const res = await fetchWallet(response.publicKey.toString(), "POST");
      if (res.status >= 200 && res.status < 400) {
        const data = await res.json();
        console.log(data);
        return data;
      } else {
        const error = new Error(res.statusText);
        console.log(error);
        alert("지갑 연결이 안되네요");
      }
    }
  }
};

const createConnection = () => {
  return new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("devnet"));
};

const createPublicKey = (publicKey: string) => {
  return new solanaWeb3.PublicKey(publicKey);
};

// 실시간 solana 가격 (USD)
const getSolanaPrice = async () => {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`,
    {
      method: "GET",
    }
  );

  const data = await response.json();
  return data.solana.usd;
};

// 지갑 잔액
const getBalance = async (walletAddress: string) => {
  const connection = createConnection();
  const publicKey = createPublicKey(walletAddress);

  const lamports = await connection.getBalance(publicKey).catch((err) => {
    console.error(`Error: ${err}`);
  });

  if (lamports) {
    // 잔액이 0이 아닐 때
    const sol = lamports / LAMPORTS_PER_SOL; // 0.000000001 단위로 처리
    return sol;
  } else {
    // 잔액이 0일 때
    return lamports;
  }
};

// 현재 브라우저에 지갑이 이미 연결되어있으면 바로 지갑 주소 받아서 요청에 대한 리턴값 반환
// export const checkWallet = async (walletAddress:string) => {
//   const newWallet = createPublicKey()
// }
//   ;

export {
  LAMPORTS_PER_SOL,
  getWallet,
  createConnection,
  createPublicKey,
  getSolanaPrice,
  getBalance,
};

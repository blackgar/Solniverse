import styled from "styled-components";
import Layout from "components/Layout";
import { createSearchParams, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRecoilValue } from "recoil";
import { userInfoAtom } from "atoms";
import Swal from "sweetalert2";
import {
  createConnection,
  findAssociatedTokenAddress,
  getBalance,
} from "utils/solanaWeb3";
import { fetchWallet } from "utils/fetcher";
import { isMobile } from "react-device-detect";
import { PublicKey } from "@solana/web3.js";

interface IDonation {
  nickname: string;
  amount: number;
  message: string;
}

function Donation() {
  const navigate = useNavigate();
  const userInfo = useRecoilValue(userInfoAtom);
  const connection = createConnection();
  const { walletAddress } = useParams();
  const [nickName, setNickName] = useState(userInfo.twitch.displayName);
  const [amount, setAmount] = useState(0);
  const [type, setType] = useState("SOL");
  const [message, setMessage] = useState("");
  const [creatorName, setCreatorName] = useState<string | undefined>();
  const [creatorImgUrl, setCreatorImgUrl] = useState("");
  const [snvBalance, setSNVBalance] = useState(0);
  const [usdcBalance, setUSDCBalance] = useState(0);
  const params = {
    amount: amount.toString(),
    nickName,
    creatorName: creatorName!,
    message,
    walletAddress: walletAddress!.toString(),
    type,
  };

  const {
    register,
    formState: { errors },
  } = useForm<IDonation>({ mode: "onBlur" });

  const handleAmount = (e: any) => {
    e.preventDefault();
    setAmount(e.target.value);
  };
  const getAsyncToken = async () => {
    const usdcAddress = await findAssociatedTokenAddress(
      new PublicKey(userInfo.walletAddress),
      new PublicKey(`${process.env.REACT_APP_USDC_TOKEN_ACCOUNT}`)
    );

    const usdcResponse = await connection.getTokenAccountBalance(
      new PublicKey(usdcAddress)
    );

    const usdcAmount = Number(usdcResponse?.value?.amount) / 1000000;
    if (usdcResponse) {
      setUSDCBalance(usdcAmount);
    }
    const snvAddress = await findAssociatedTokenAddress(
      new PublicKey(userInfo.walletAddress),
      new PublicKey(`${process.env.REACT_APP_SNV_TOKEN_ACCOUNT}`)
    );

    const snvResponse = await connection.getTokenAccountBalance(
      new PublicKey(snvAddress)
    );

    const snvAmount = Number(snvResponse?.value?.amount) / 1000000;
    if (snvResponse) {
      setSNVBalance(snvAmount);
    }
  };

  const onClick = () => {
    if (!isMobile) {
      if (userInfo.walletAddress) {
        if (!(amount > 0)) {
          Swal.fire({
            title: "?????? ??????",
            text: "????????? ???????????????. ?????? ??? ??????????????? ??????????????????.",
            icon: "warning",
          });
          return;
        }
      } else {
        Swal.fire({
          title: "?????? ?????? ??????",
          text: `?????? ????????? ???????????????. ?????? ??????????????? ??????????????? ????????????.`,
          icon: "info",
        });
        return;
      }
    }

    if (!isMobile) {
      if (userInfo.walletAddress) {
        if (!amount || !nickName) {
          Swal.fire({
            title: "?????? ??????",
            text: "?????????????????? ??????????????? ?????? ??????????????????.",
            icon: "warning",
          });
          return;
        }

        if (errors.nickname) {
          Swal.fire({
            title: "?????? ??????",
            text: "?????????????????? ????????? ??????????????????.",
            icon: "warning",
          });
          return;
        }
        if (errors.amount) {
          Swal.fire({
            title: "?????? ??????",
            text: "??????????????? ????????? ??????????????????.",
            icon: "warning",
          });
          return;
        }
        navigate({
          pathname: "/payment",
          search: `?${createSearchParams(params)}`,
        });
      }
    } else {
      if (!amount || !nickName) {
        Swal.fire({
          title: "?????? ??????",
          text: "?????????????????? ??????????????? ?????? ??????????????????.",
          icon: "warning",
        });
        return;
      }
      if (errors.nickname) {
        Swal.fire({
          title: "?????? ??????",
          text: "?????????????????? ????????? ??????????????????.",
          icon: "warning",
        });
        return;
      }
      if (!amount) {
        Swal.fire({
          title: "?????? ??????",
          text: "??????????????? ????????? ??????????????????.",
          icon: "warning",
        });
        return;
      }
      navigate({
        pathname: "/payment",
        search: `?${createSearchParams(params)}`,
      });
    }
  };

  const onSubmit = (e: any) => {
    setType(e.target.value);
  };

  const getCreatorInfo = async (walletAddress: string) => {
    try {
      const res = await fetchWallet(walletAddress!);
      if (res.status >= 200 && res.status < 400) {
        const data = await res.json();
        return data;
      } else {
        const error = new Error(res.statusText);
        throw error;
      }
    } catch (error) {
      const res = await fetchWallet(walletAddress!, "POST");
      if (res.status >= 200 && res.status < 400) {
        const data = await res.json();

        return data;
      } else {
        const error = new Error(res.statusText);

        Swal.fire(
          "?????? ?????? ??????",
          "?????? ????????? ????????? ???????????? ?????? ????????????.",
          "warning"
        );
      }
    }
  };
  const getAsyncCreatorInfo = async () => {
    const creatorInfo = await getCreatorInfo(walletAddress!);
    const displayName = walletAddress?.slice(0, 10);
    if (!creatorInfo.user.twitch) {
      setCreatorName(displayName);
      setCreatorImgUrl(`${process.env.PUBLIC_URL}/images/??????.png`);
    } else {
      setCreatorName(creatorInfo.user.twitch.displayName);
      setCreatorImgUrl(creatorInfo.user.twitch.profileImageUrl);
    }
  };

  useEffect(() => {
    getAsyncCreatorInfo();
    if (!userInfo.walletAddress) {
      Swal.fire({
        title: "??? ???????????????????",
        text: "????????? ????????? ?????????????????????????",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "??????",
        cancelButtonText: "??????",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/service");
          return;
        }
      });
      return;
    }
  }, []);

  useEffect(() => {
    const getAsyncSol = async () => {
      const sol = await getBalance(userInfo.walletAddress);
      if (type === "SOL" && sol < amount) {
        Swal.fire({
          html: "????????? ????????? ?????? ???????????? ????????????.<br> ?????? ??????????????????. ????",
          showClass: {
            popup: "animate__animated animate__fadeInDown",
          },
          hideClass: {
            popup: "animate__animated animate__fadeOutUp",
          },
          icon: "warning",
        });
        // alert("?????? ???????????? ?????? ????????? ?????????????????????. SOL??? ??????????????????.");
        setAmount(0);
      }
    };
    getAsyncSol();
    getAsyncToken();
    if (type === "USDC" && usdcBalance < amount) {
      Swal.fire({
        html: "????????? ????????? ?????? ???????????? ????????????.<br> ?????? ??????????????????. ????",
        showClass: {
          popup: "animate__animated animate__fadeInDown",
        },
        hideClass: {
          popup: "animate__animated animate__fadeOutUp",
        },
        icon: "warning",
      });
      // alert("?????? ???????????? ?????? ????????? ?????????????????????. SOL??? ??????????????????.");
      setAmount(0);
    }
  }, [amount, snvBalance, usdcBalance]);

  return (
    <Layout>
      <Container>
        <MainContainer>
          <DonationWrapper>
            <CreatorWrapper>
              <CreatorInfoWrapper>
                <CreatorProfileImage src={creatorImgUrl} />
                <CreatorName>{creatorName}?????? ??????</CreatorName>
              </CreatorInfoWrapper>
              <CreatorImage />
            </CreatorWrapper>
          </DonationWrapper>
          <DonationForm>
            <DonatorWrapper>
              <DonateNameWrapper>
                <DonateInputName>???????????????</DonateInputName>
              </DonateNameWrapper>
              <DonateInputWrapper>
                <Input
                  {...register("nickname", {
                    required: "?????? ?????????????????????.",
                    pattern: {
                      value: /^[???-??????-???a-zA-Z0-9 ]{2,15}$/,
                      message:
                        "2~15?????? ??????, ?????? ??? ?????????, ????????? ?????? ???????????????.",
                    },
                    onChange: (e) => {
                      setNickName(e.target.value);
                    },
                  })}
                  value={`${nickName}`}
                />
              </DonateInputWrapper>
            </DonatorWrapper>
            <ErrorWrapper>
              <DonateMessageWrapper></DonateMessageWrapper>
              <DonateInputName>
                <ErrorMessage>{errors?.nickname?.message}</ErrorMessage>
              </DonateInputName>
            </ErrorWrapper>
            <DonatorWrapper>
              <DonateNameWrapper>
                <DonateInputName>????????????</DonateInputName>
              </DonateNameWrapper>
              <DonateInputWrapper>
                <Input
                  {...register("amount", {
                    pattern: {
                      value: /^[0-9.]*$/,
                      message: "????????? . ????????? ?????? ???????????????.",
                    },
                    onChange: (e) => {
                      setAmount(e.target.value);
                    },
                  })}
                  value={amount === 0 ? "" : `${amount}`}
                  style={{ display: "flex", justifyContent: "space-between" }}
                  placeholder="??????????????? ??????????????????."
                />

                <Select onChange={onSubmit}>
                  <Option value="SOL">SOL</Option>
                  <Option value="USDC">USDC</Option>
                </Select>
              </DonateInputWrapper>
            </DonatorWrapper>
            <ErrorWrapper>
              <DonateMessageWrapper></DonateMessageWrapper>
              <DonateInputName>
                <ErrorMessage>{errors?.amount?.message}</ErrorMessage>
              </DonateInputName>
            </ErrorWrapper>
            {type === "SOL" ? (
              <PriceButtonWrapper>
                <DonatePriceButton value="0.01" onClick={handleAmount}>
                  0.01
                </DonatePriceButton>
                <DonatePriceButton value="0.05" onClick={handleAmount}>
                  0.05
                </DonatePriceButton>
                <DonatePriceButton value="0.1" onClick={handleAmount}>
                  0.1
                </DonatePriceButton>
                <DonatePriceButton value="0.5" onClick={handleAmount}>
                  0.5
                </DonatePriceButton>
                <DonatePriceButton value="1" onClick={handleAmount}>
                  1
                </DonatePriceButton>
                <DonatePriceButton value="5" onClick={handleAmount}>
                  5
                </DonatePriceButton>
                <DonatePriceButton
                  style={{ marginRight: "0px" }}
                  value="10"
                  onClick={handleAmount}
                >
                  10
                </DonatePriceButton>
              </PriceButtonWrapper>
            ) : (
              <PriceButtonWrapper>
                <DonatePriceButton value="0.5" onClick={handleAmount}>
                  0.5
                </DonatePriceButton>
                <DonatePriceButton value="1" onClick={handleAmount}>
                  1
                </DonatePriceButton>
                <DonatePriceButton value="5" onClick={handleAmount}>
                  5
                </DonatePriceButton>
                <DonatePriceButton value="10" onClick={handleAmount}>
                  10
                </DonatePriceButton>
                <DonatePriceButton value="20" onClick={handleAmount}>
                  20
                </DonatePriceButton>
                <DonatePriceButton value="50" onClick={handleAmount}>
                  50
                </DonatePriceButton>
                <DonatePriceButton
                  style={{ marginRight: "0px" }}
                  value="100"
                  onClick={handleAmount}
                >
                  100
                </DonatePriceButton>
              </PriceButtonWrapper>
            )}

            <DonatorWrapper>
              <DonateMessageWrapper>
                <DonateMessageName>???????????????</DonateMessageName>
              </DonateMessageWrapper>
              <DonateInputWrapper>
                <MessageTextarea
                  {...register("message", {
                    onChange: (e) => {
                      if (e.target.value.length > 50) {
                        alert("?????? ???????????? ??????????????????.");
                      } else {
                        setMessage(e.target.value);
                      }
                    },
                  })}
                  placeholder="?????????????????? ??????????????????."
                />
              </DonateInputWrapper>
            </DonatorWrapper>
          </DonationForm>
          <ErrorWrapper>
            <DonateMessageWrapper></DonateMessageWrapper>
            <MessageNumberWrapper>
              <MessageNumber>{message.length}/50</MessageNumber>
            </MessageNumberWrapper>
          </ErrorWrapper>
          <Hr />
          <DonationWrapper>
            <DonatorWrapper>
              <TotalPrice>Total</TotalPrice>
              <TotalUSDC>
                {amount} {type}
              </TotalUSDC>
            </DonatorWrapper>
          </DonationWrapper>
          <DonationWrapper>
            <ButtonWrapper>
              <DonateButton onClick={onClick}>????????????</DonateButton>
              {/* <DonateButton onClick={Donate}>Donate</DonateButton> */}
            </ButtonWrapper>
          </DonationWrapper>
        </MainContainer>
      </Container>
    </Layout>
  );
}

const Container = styled.div`
  margin-top: 32px;
  display: flex;
  justify-content: center;
  @media screen and (max-width: 767px) {
    margin-top: 16px;
  }
`;
const MainContainer = styled.div`
  width: 70%;
  @media screen and (max-width: 767px) {
    width: 100%;
  }
`;

const DonationWrapper = styled.div`
  margin-bottom: 32px;
`;

const DonationForm = styled.form`
  margin-bottom: 0px;
`;

const CreatorWrapper = styled.div``;

const CreatorName = styled.div`
  font-size: 32px;
  font-weight: bold;
  @media screen and (max-width: 767px) {
    font-size: 24px;
  }
`;

const CreatorContent = styled.div`
  font-size: 24px;
  @media screen and (max-width: 767px) {
    font-size: 18px;
  }
`;

const CreatorInfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
`;

const CreatorProfileImage = styled.img`
  width: 50px;
  border-radius: 30px;
  margin-right: 8px;
`;

const CreatorImage = styled.img.attrs({
  src: `${process.env.PUBLIC_URL}/images/??????.png`,
})`
  width: 100%;
  height: auto;
`;

const DonatorWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  /* margin-top: 24px; */
`;

const ErrorWrapper = styled(DonatorWrapper)`
  width: 100%;
  margin-left: 3.5%;
  margin-bottom: 24px;
`;

const Select = styled.select`
  width: 30%;
  height: 40px;
  border-radius: 4px;
  /* border-width: 1px; */
  /* border-color: whitesmoke; */
  border: 1px solid ${(props) => props.theme.borderColor};
  font-size: 16px;
  color: ${(props) => props.theme.subTextColor};
  background-color: ${(props) => props.theme.boxColor};
  /* font-weight: bold; */
  margin-left: 4px;
  @media screen and (max-width: 767px) {
    font-size: 14px;
  }
`;

const Option = styled.option`
  width: 30%;
  height: 40px;
  border-radius: 4px;
  /* border-width: 1px; */
  /* border-color: whitesmoke; */
  border: 1px solid ${(props) => props.theme.borderColor};
  font-size: 16px;
  color: ${(props) => props.theme.subTextColor};
  background-color: ${(props) => props.theme.boxColor};
  /* font-weight: bold; */
  @media screen and (max-width: 767px) {
    font-size: 14px;
  }
`;

const PriceButtonWrapper = styled.div`
  display: flex;
  width: 100%;
  justify-content: right;
  margin-bottom: 32px;
`;

const DonatePriceButton = styled.button`
  width: 10%;
  height: 30px;
  color: #ffffff;
  background-color: ${(props) => props.theme.ownColor};
  border: none;
  border-radius: 20px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin-right: 8px;
  &:hover {
    /* background: rgb(0,3,255); */
    background: linear-gradient(45deg, #870ff8 0%, #0f3af8 60%, #0ff8ec 100%);
  }
  @media screen and (max-width: 767px) {
    font-size: 12px;
    margin-right: 4px;
  }
`;

const DonateInputName = styled.div`
  display: flex;
  align-items: center;
  font-size: 16px;
  width: 100%;
  @media screen and (max-width: 767px) {
    font-size: 14px;
  }
`;

const DonateMessageWrapper = styled.div`
  display: flex;
  margin-top: 3px;
  font-size: 16px;
  width: 20%;
  @media screen and (max-width: 767px) {
    font-size: 14px;
  }
`;

const DonateMessageName = styled.div`
  font-size: 16px;
  @media screen and (max-width: 767px) {
    font-size: 14px;
    margin-top: 3px;
  }
`;

const DonateNameWrapper = styled.div`
  display: flex;
  align-items: center;
  font-size: 16px;
  width: 20%;
  @media screen and (max-width: 767px) {
    font-size: 14px;
  }
`;

const DonateInputWrapper = styled.div`
  width: 80%;
  display: flex;
`;

const ErrorMessage = styled.p`
  margin-top: 3px;
  font-size: 14px;
  font-weight: bold;
  color: #ff5e57;
  @media screen and (max-width: 767px) {
    font-size: 12px;
  }
`;

const Input = styled.input`
  width: 100%;
  height: 40px;
  border-radius: 4px;
  /* border-width: 1px; */
  /* border-color: whitesmoke; */
  border: 1px solid ${(props) => props.theme.borderColor};
  font-size: 16px;
  color: ${(props) => props.theme.subTextColor};
  background-color: ${(props) => props.theme.boxColor};
  /* font-weight: bold; */
  @media screen and (max-width: 767px) {
    font-size: 14px;
  }
`;

const MessageTextarea = styled.textarea`
  width: 100%;
  height: 100px;
  border-radius: 4px;
  border: 1px solid ${(props) => props.theme.borderColor};
  font-size: 16px;
  color: ${(props) => props.theme.subTextColor};
  background-color: ${(props) => props.theme.boxColor};
  @media screen and (max-width: 767px) {
    font-size: 14px;
  }
`;

const MessageNumberWrapper = styled.div`
  display: flex;
  justify-content: right;
  margin-right: 32px;
  @media screen and (max-width: 767px) {
    margin-right: 8px;
  }
  @media screen and (max-width: 1024px) {
    margin-right: 24px;
  }
`;
const MessageNumber = styled.div``;

const Hr = styled.hr`
  margin: 32px 0px;
  background-color: ${(props) => props.theme.borderColor};
`;

const TotalPrice = styled.div`
  font-size: 20px;
  font-weight: bold;
  @media screen and (max-width: 767px) {
    font-size: 16px;
  }
`;

const TotalUSDC = styled.div`
  font-size: 24px;
  font-weight: bold;
  @media screen and (max-width: 767px) {
    font-size: 20px;
  }
`;

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: center;
`;

const DonateButton = styled.button`
  width: 30%;
  height: 40px;
  color: #ffffff;
  background-color: ${(props) => props.theme.ownColor};
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  &:hover {
    background: linear-gradient(45deg, #870ff8 0%, #0f3af8 60%, #0ff8ec 100%);
  }
`;

export default Donation;

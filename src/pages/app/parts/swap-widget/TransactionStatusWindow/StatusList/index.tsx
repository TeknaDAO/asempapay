import { AssetInfo, ChainInfo } from "@axelar-network/axelarjs-sdk"
import styled from "styled-components"
import screenConfigs from "config/screenConfigs"
import { useRecoilValue } from "recoil"
import { DESTINATION_TOKEN_KEY, SOURCE_TOKEN_KEY } from "config/consts"
import downstreamServices from "config/downstreamServices"
import CopyToClipboard from "components/Widgets/CopyToClipboard"
import Link from "components/Widgets/Link"
import BoldSpan from "components/StyleComponents/BoldSpan"
import { FlexRow } from "components/StyleComponents/FlexRow"
import { ImprovedTooltip } from "components/Widgets/ImprovedTooltip"
import { SVGImage } from "components/Widgets/SVGImage"
import {
  ChainSelection,
  DestinationAddress,
  SourceAsset,
} from "state/ChainSelection"
import {
  DepositMadeInApp,
  NumberConfirmations,
  SourceDepositAddress,
  SrcChainDepositTxHash,
} from "state/TransactionStatus"
import { getShortenedWord } from "utils/wordShortener"
import logoKeplr from "assets/svg/keplr.svg"
import logoMetamask from "assets/svg/metamask.svg"
import logoTerraStation from "assets/svg/terra-station.svg"
import { WalletType } from "state/Wallet"
import { hasSelectedNativeAssetForChain } from "utils/hasSelectedNativeAssetOnChain"
import { getConfigs } from "api/WaitService"
import { ListItem } from "./ListItem"
import { MetaMaskWallet } from "hooks/wallet/MetaMaskWallet"
import { useEffect, useState } from "react"
import { FlexColumn } from "components/StyleComponents/FlexColumn"
import { DepositFromWallet } from "./DepositFromWallet"
import { getAssetSymbolToShow } from "utils/getAssetSymbolToShow"
import decimaljs from "decimal.js";
import { restrictedAccounts } from "config/restrictedAccounts"

const StyledStatusList = styled.div`
  width: 100%;
  height: 65%;
  @media ${screenConfigs.media.desktop} {
    margin-top: 20px;
  }
`
const StyledSVGImage = styled(SVGImage)`
  cursor: pointer;
`
const HelperWidget = styled.span`
  box-sizing: border-box;
  padding: 0.5em 1em 0.5em 1em;
  text-align: center;
  background-color: ${(props) => props.theme.headerBackgroundColor};
  border-radius: 50px;
  color: white;
  cursor: pointer;
  font-size: smaller;
  transition: opacity 0.2s ease;
  min-width: fit-content;
  &:hover {
    opacity: 0.8;
  }
`

interface IStatusListProps {
  activeStep: number
  isWalletConnected: boolean
  connectToWallet: (walletType: WalletType) => void
  walletBalance: number
  reloadBalance: () => void
  walletAddress: string
  depositAddress: AssetInfo
  cumDepAmt: number
  minDepositAmt: number
}

const StatusList = (props: IStatusListProps) => {
  const { activeStep } = props
  const selectedSourceAsset = useRecoilValue(SourceAsset)
  const sourceChain = useRecoilValue(ChainSelection(SOURCE_TOKEN_KEY))
  const destinationChain = useRecoilValue(ChainSelection(DESTINATION_TOKEN_KEY))
  const depositAddress = useRecoilValue(SourceDepositAddress)
  const destinationAddress = useRecoilValue(DestinationAddress)
  const srcChainDepositHash = useRecoilValue(SrcChainDepositTxHash)
  const [tokenToAdd, setTokenToAdd] = useState(false)
  const srcConfirmStatus = useRecoilValue(NumberConfirmations(SOURCE_TOKEN_KEY))
  const [assetSymbolToShow, setAssetSymbolToShow] = useState("");
  const depositMadeInApp = useRecoilValue(DepositMadeInApp);
    
  useEffect(() => {
    setAssetSymbolToShow(getAssetSymbolToShow(
      sourceChain as ChainInfo,
      destinationChain as ChainInfo,
      selectedSourceAsset as AssetInfo,
      selectedSourceAsset?.assetSymbol
    ))
  }, [selectedSourceAsset, sourceChain, destinationChain]);

  useEffect(() => {
    if (tokenToAdd) {
      setTimeout(() => {
        addTokenToMetamask(destinationChain, selectedSourceAsset)
        setTokenToAdd(false)
      }, 2000)
    }
  }, [tokenToAdd, destinationChain, selectedSourceAsset])

  const renderWalletButton = () => {
    if (props.isWalletConnected) return null

    if (sourceChain?.chainName?.toLowerCase() !== "terra") {
      const logo = sourceChain?.module === "evm" ? logoMetamask : logoKeplr
      const walletName = sourceChain?.module === "evm" ? "Metamask" : "Keplr"
      const walletType =
        sourceChain?.module === "evm" ? WalletType.METAMASK : WalletType.KEPLR
      return (
        <div>
          <FlexRow
            style={{
              width: `100%`,
              justifyContent: `flex-start`,
              marginTop: `0.5em`,
            }}
          >
            <div style={{ marginRight: `5px` }}>
              Send{" "}
              {sourceChain?.module === "axelarnet" ? "IBC transfer" : "deposit"}{" "}
              here via:
            </div>
            <HelperWidget onClick={() => props.connectToWallet(walletType)}>
              <WalletLogo src={logo} />
              <span style={{ marginLeft: "0.5em" }}>{walletName}</span>
            </HelperWidget>
          </FlexRow>
          {hasSelectedNativeAssetForChain(
            selectedSourceAsset as AssetInfo,
            sourceChain?.chainName
          ) && (
            <div
              style={{
                width: `100%`,
                justifyContent: `flex-start`,
                marginTop: `0.5em`,
                fontStyle: `italic`,
                fontSize: `0.8em`,
              }}
            >
              (Satellite accepts native {sourceChain?.chainSymbol} tokens and
              automatically converts them to W{sourceChain?.chainSymbol} for the
              required deposit.)
            </div>
          )}
        </div>
      )
    } else {
      return (
        <div style={{ marginTop: `0.5em` }}>
          <p>Send IBC transfer here via:</p>
          <FlexRow
            style={{
              justifyContent: `space-between`,
              width: `80%`,
            }}
          >
            <HelperWidget
              onClick={() => props.connectToWallet(WalletType.KEPLR)}
              style={{ marginRight: "2px" }}
            >
              <span style={{ marginRight: "5px" }}>Keplr Wallet</span>
              <WalletLogo src={logoKeplr} />
            </HelperWidget>
            <p style={{ marginRight: "2px" }}>OR</p>
            <HelperWidget
              onClick={() => props.connectToWallet(WalletType.TERRA)}
            >
              <span style={{ marginRight: "5px" }}>Terra Station</span>
              <WalletLogo src={logoTerraStation} />
            </HelperWidget>
          </FlexRow>
        </div>
      )
    }
  }

  return (
    <StyledStatusList>
      <ListItem
        className={"joyride-status-step-1"}
        step={1}
        activeStep={activeStep}
        text={
          activeStep === 1 ? (
            <span>
              Generating a one-time deposit address for{" "}
              {assetSymbolToShow}{" "}
              recipient:{" "}
              <BoldSpan>
                {getShortenedWord(destinationAddress as string, 5)}
              </BoldSpan>
            </span>
          ) : (
            <FlexColumn style={{ alignItems: `flex-start` }}>
              <span style={{ marginBottom: `0.5em` }}>
                {assetSymbolToShow} recipient:{" "}
                <BoldSpan>
                  {getShortenedWord(destinationAddress as string, 5)}
                </BoldSpan>
              </span>
              <span>
                {" "}
                Deposit address:{" "}
                <BoldSpan style={{ marginRight: `5px` }}>
                  {getShortenedWord(depositAddress?.assetAddress, 5)}
                </BoldSpan>
                {!restrictedAccounts?.includes(props.walletAddress?.toLowerCase()) && <ImprovedTooltip
                  anchorContent={
                    <CopyToClipboard
                      JSXToShow={<span></span>}
                      height={`12px`}
                      width={`10px`}
                      textToCopy={depositAddress?.assetAddress || ""}
                      showImage={true}
                    />
                  }
                  tooltipText={
                    "Optional: Copy this address if you want to make this deposit from outside Satellite."
                  }
                  tooltipAltText={
                    "Copied! Please be sure you send the correct assets to this address."
                  }
                />}
              </span>
            </FlexColumn>
          )
        }
      />
      <ListItem
        className={"joyride-status-step-2"}
        step={2}
        activeStep={activeStep}
        text={
          activeStep >= 2 ? (
            <div
              style={{
                overflowWrap: `break-word`,
                overflow: `hidden`,
                width: `100%`,
              }}
            >
              {srcChainDepositHash &&
                linkToExplorer(
                  sourceChain as ChainInfo,
                  srcChainDepositHash as string
                )}

              {/* TODO: this below is only temporary for crescent */}
              {srcChainDepositHash === "" && activeStep === 2 &&
                `Waiting for your deposit to be confirmed.`}
              {/* TODO: this above is only temporary for crescent */}
              
              {!depositMadeInApp && activeStep >= 3 && (
                <span style={{ fontStyle: `italic` }}>
                  {props.cumDepAmt} {assetSymbolToShow} deposit detected in {" "}
                  {getShortenedWord(depositAddress?.assetAddress)}
                  {(props.cumDepAmt <= props.minDepositAmt) && <BoldSpan>, which is NOT larger than the {props.minDepositAmt} {assetSymbolToShow} fee.</BoldSpan>}
                </span>
              )}
              {activeStep === 2 && (
                <DepositFromWallet
                  isWalletConnected={props.isWalletConnected}
                  walletBalance={props.walletBalance}
                  reloadBalance={props.reloadBalance}
                  walletAddress={props.walletAddress}
                  depositAddress={depositAddress as AssetInfo}
                  minDepositAmt={props.minDepositAmt}
                />
              )}
              {activeStep === 2 && renderWalletButton()}
            </div>
          ) : (
            `Waiting for your deposit into the deposit account.`
          )
        }
      />
      <ListItem
        className={"joyride-status-step-3"}
        step={3}
        activeStep={activeStep}
        text={
          activeStep >= 3 ? (
            <FlexRow style={{ width: `100%`, justifyContent: `space-between` }}>
              <div>
                {activeStep === 4
                  ? "Transaction Complete!"
                  : !!srcConfirmStatus?.numberConfirmations
                  ? props.cumDepAmt > props.minDepositAmt
                    ? `Deposit tx confirmed. Your ${
                      destinationChain?.chainName
                    } balance will be updated within the next ~${
                      destinationChain?.chainName?.toLowerCase() === "ethereum"
                        ? 5
                        : 3
                    } minutes`
                    : `Deposit ${<BoldSpan>more than</BoldSpan>} ${(new decimaljs(props.minDepositAmt)).minus(props.cumDepAmt)} ${assetSymbolToShow} to continue.`
                  : `Your ${destinationChain?.chainName} balance will be updated within the next few minutes`}
              </div>

              <FlexRow>
                {destinationChain?.module === "evm" && (
                  <ImprovedTooltip
                    anchorContent={
                      <WalletLogo
                        src={logoMetamask}
                        onClick={() =>
                          confirmChainAndAddToken(
                            destinationChain,
                            selectedSourceAsset,
                            () => setTokenToAdd(true)
                          )
                        }
                        height={`1.5em`}
                        width={`1.5em`}
                        margin={`0.5em`}
                      />
                    }
                    tooltipText={`Add ${assetSymbolToShow} token to Metamask`}
                    tooltipAltText={""}
                  />
                )}
                {getBlockExplorer(destinationChain as ChainInfo) && (
                  <ImprovedTooltip
                    anchorContent={
                      <WalletLogo
                        src={
                          require(`assets/svg/logos/${destinationChain?.chainSymbol}.svg`)
                            .default
                        }
                        onClick={() =>
                          window.open(
                            getBlockExplorerLink(
                              destinationChain as ChainInfo,
                              selectedSourceAsset as AssetInfo,
                              destinationAddress as string
                            ),
                            "_blank"
                          )
                        }
                        height={`1.5em`}
                        width={`1.5em`}
                        margin={`0.5em`}
                      />
                    }
                    tooltipText={`View ${
                      assetSymbolToShow
                    } balance on ${
                      getBlockExplorer(destinationChain as ChainInfo)?.name
                    }`}
                    tooltipAltText={""}
                  />
                )}
              </FlexRow>
            </FlexRow>
          ) : (
            `Finalizing your transaction on ${destinationChain?.chainName}.`
          )
        }
      />
    </StyledStatusList>
  )
}

const WalletLogo = ({
  src,
  onClick,
  height,
  width,
  margin,
}: {
  src: any
  onClick?: any
  height?: string
  width?: string
  margin?: string
}) => (
  <span onClick={onClick}>
    <StyledSVGImage
      height={height || `1em`}
      width={width || `1em`}
      margin={margin || `0em 0em -0.125em 0em`}
      src={src}
    />
  </span>
)

const addTokenToMetamask = async (
  destinationChain: ChainInfo | null,
  selectedSourceAsset: AssetInfo | null
) => {
  try {
    return await (window as any).ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: getTokenAddress(
            destinationChain as ChainInfo,
            selectedSourceAsset as AssetInfo
          ),
          symbol: selectedSourceAsset?.assetSymbol,
          decimals: selectedSourceAsset?.decimals,
          image: "",
        },
      },
    })
  } catch (error) {
    console.log(error)
  }
}
const confirmChainAndAddToken = async (
  destinationChain: ChainInfo | null,
  selectedSourceAsset: AssetInfo | null,
  cb: any
) => {
  const { chainName } = destinationChain as ChainInfo
  const _chainName = chainName?.toLowerCase() || ""
  const evmWallet = new MetaMaskWallet(_chainName)

  if (!evmWallet.isChainActive(_chainName)) {
    await evmWallet.switchChain(_chainName)
    cb()
  } else await addTokenToMetamask(destinationChain, selectedSourceAsset)
}

const linkToExplorer = (sourceChainSelection: ChainInfo, txHash: string) => {
  const blockExplorer = getBlockExplorer(sourceChainSelection)

  return txHash ? (
    <FlexRow style={{ justifyContent: `space-between` }}>
      <span>
        Deposit TX:{" "}
        <BoldSpan style={{ marginRight: `5px` }}>
          {getShortenedWord(txHash)}
        </BoldSpan>
        <ImprovedTooltip
          anchorContent={
            <CopyToClipboard
              JSXToShow={<span></span>}
              height={`12px`}
              width={`10px`}
              textToCopy={txHash}
              showImage={true}
            />
          }
          tooltipText={"Copy TX hash"}
          tooltipAltText={"Copied!"}
        />
      </span>
      {blockExplorer && (
        <ImprovedTooltip
          anchorContent={
            <Link
              href={`${blockExplorer.url}${
                blockExplorer?.url?.includes("mintscan") 
                  ? "txs/" 
                  : ["sei"].includes(sourceChainSelection?.chainName?.toLowerCase())
                    ? "transaction/"
                    : ["fetch"].includes(sourceChainSelection?.chainName?.toLowerCase())
                      ? "transactions/"
                      : "tx/"
              }${txHash}`}
            >
              <SVGImage
                style={{ marginLeft: `5px` }}
                src={
                  require(`assets/svg/logos/${sourceChainSelection.chainSymbol}.svg`)
                    .default
                }
                height={`1.5em`}
                width={`1.5em`}
                margin={`0.5em`}
              />
            </Link>
          }
          tooltipText={`View deposit transaction on ${
            getBlockExplorer(sourceChainSelection as ChainInfo)?.name
          }`}
          tooltipAltText={""}
        />
      )}
    </FlexRow>
  ) : null
}

const getBlockExplorer = (
  chain: ChainInfo
): { name: string; url: string } | null => {
  return (
    downstreamServices.blockExplorers[process.env.REACT_APP_STAGE as string] &&
    downstreamServices.blockExplorers[process.env.REACT_APP_STAGE as string][
      chain?.chainName?.toLowerCase() as string
    ]
  )
}

const getBlockExplorerLink = (
  destinationChain: ChainInfo,
  asset: AssetInfo,
  destinationAddress: string
) => {
  const blockExplorer = getBlockExplorer(destinationChain)

  if (!blockExplorer) return ""
  if (destinationChain?.chainName?.toLowerCase() === "kujira")
    return blockExplorer.url + "address/" + destinationAddress

  if (destinationChain.module === "axelarnet")
    return blockExplorer.url + "account/" + destinationAddress

  const tokenAddress = getTokenAddress(destinationChain, asset)

  if (!tokenAddress) return `${blockExplorer.url}address/${destinationAddress}`

  return `${blockExplorer.url}token/${tokenAddress}?a=${destinationAddress}`
}

const getTokenAddress = (destinationChain: ChainInfo, asset: AssetInfo) => {
  const config = getConfigs(process.env.REACT_APP_STAGE as string)
  const tokenAddressMap =
    config?.ethersJsConfigs[destinationChain?.chainName.toLowerCase()]
      ?.tokenAddressMap
  return tokenAddressMap[asset?.common_key as string]
}

export default StatusList

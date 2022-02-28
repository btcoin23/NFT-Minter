import {
  Contract,
  ContractReceipt,
  ContractTransaction,
  ethers,
  Event,
} from "ethers";
import { Result } from "ethers/lib/utils";
import Marketplace from "../../../artifacts/contracts/Marketplace.sol/Marketplace.json";
import { MARKETPLACE_ADDRESS, TOKEN_ADDRESS } from "../../../config";
import { ItemEntity, TokenEntity } from "../../types";
import { readIPFSField } from "../../utils/readIPFSField";
import { createToken } from "../ERC1155Token/createToken";

interface CreateItemProps {
  /* Price of item in @todo */
  price: string;
  /* Item name */
  name: string;
  /* Initial item stock */
  quantity: number;
  /* IPFS metadata hash */
  hash: string;
}

const createItem = async ({
  price,
  name,
  quantity,
  hash,
}: CreateItemProps): Promise<ItemEntity> => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();

  // Create ERC1155 Token
  const tokenId = await createToken({
    signer,
    tokenURI: name,
    quantity,
  });

  // Max supported number of decimals is 9
  if (price.length > 11) {
    price = String(Number(price).toFixed(9));
  }

  // Convert BigNumber to wei value
  const weiPrice = ethers.utils.parseUnits(price, "ether");

  // Create item from marketplace contract
  const marketplaceContract: Contract = new ethers.Contract(
    MARKETPLACE_ADDRESS,
    Marketplace.abi,
    signer
  );
  const transaction: ContractTransaction = await marketplaceContract.createItem(
    tokenId,
    TOKEN_ADDRESS,
    hash,
    weiPrice
  );
  const receipt: ContractReceipt = await transaction.wait();

  // Get values from created item
  const event: Event | undefined = receipt.events?.find(
    ({ event }) => event === "ItemCreated"
  );

  const [itemId, _, tokenContract, tokenHash, __, seller, owner]: Result =
    event?.args as TokenEntity[];

  // Read values from IPFS metadata
  const image = await readIPFSField({ cid: tokenHash, property: "image" });

  const item: ItemEntity = {
    itemId,
    name,
    image,
    token: {
      tokenId,
      tokenContract,
      tokenHash,
      price,
      seller,
      owner,
    },
  };

  return item;
};

export { createItem };
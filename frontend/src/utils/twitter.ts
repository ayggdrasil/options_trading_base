import {ITwitterInfo} from "@/interfaces/interfaces.userSlice.ts";
import { SupportedChains } from "@callput/shared";
import { CONNECT_TWITTER_API, GET_TWITTER_API, REMOVE_TWITTER_API } from "@/networks/apis";


export async function connectTwitter(chain:SupportedChains, address: `0x${string}` | undefined) {
  try {
    window.location.href = CONNECT_TWITTER_API[chain] + (address ?? '')
  } catch (error) {
    console.error('Error connecting to Twitter:', error);
  }

}

export async function removeTwitter(chain:SupportedChains, address: `0x${string}` | undefined) {
  try {
    window.location.href = REMOVE_TWITTER_API[chain] + (address ?? '');
  } catch (error) {
    console.error('Error removing Twitter:', error);
  }

}

export async function getTwitterInfo(
  chain: SupportedChains,
  addresses: `0x${string}`[] | undefined
): Promise<Record<string, ITwitterInfo>> {
  const defaultTwitterInfo: ITwitterInfo = {
    isConnected: false,
    id: "",
    username: "",
    profileImageUrl: ""
  };

  if (!addresses || addresses.length === 0) {
    return {};
  }

  try {
    const response = await fetch(GET_TWITTER_API[chain], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ addresses }),
    });
    const result = await response.json();
    
    if (result.statusCode !== 200 || !result.data) {
      return addresses.reduce((acc, address) => {
        acc[address] = { ...defaultTwitterInfo };
        return acc;
      }, {} as Record<string, ITwitterInfo>);
    }

    return result.data.reduce((acc: Record<string, ITwitterInfo>, item: any) => {
      if (item.address && item.id) {
        acc[item.address] = {
          isConnected: true,
          id: item.id,
          username: item.username,
          profileImageUrl: item.profileImageUrl
        };
      } else {
        acc[item.address] = { ...defaultTwitterInfo };
      }
      return acc;
    }, {});

  } catch (error) {
    console.log(error);
    return addresses.reduce((acc, address) => {
      acc[address] = { ...defaultTwitterInfo };
      return acc;
    }, {} as Record<string, ITwitterInfo>);
  }
}
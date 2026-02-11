// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


abstract contract AddressBook {
    struct AddressSet {
        address DEPLOYER;
        address PROXY_ADMIN;
        address WBTC;
        address WETH;
        address USDC;
        address SAFE_DEPLOYER;
        address OPTIONS_AUTHORITY;
        address VAULT_PRICE_FEED;
        address OPTIONS_MARKET;
        address S_VAULT;
        address M_VAULT;
        address L_VAULT;
        address S_VAULT_UTILS;
        address M_VAULT_UTILS;
        address L_VAULT_UTILS;
        address S_USDG;
        address M_USDG;
        address L_USDG;
        address S_OLP;
        address M_OLP;
        address L_OLP;
        address S_OLP_MANAGER;
        address M_OLP_MANAGER;
        address L_OLP_MANAGER;
        address S_REWARD_TRACKER;
        address M_REWARD_TRACKER;
        address L_REWARD_TRACKER;
        address S_REWARD_DISTRIBUTOR;
        address M_REWARD_DISTRIBUTOR;
        address L_REWARD_DISTRIBUTOR;
        address S_REWARD_ROUTER_V2;
        address M_REWARD_ROUTER_V2;
        address L_REWARD_ROUTER_V2;
        address CONTROLLER;
        address POSITION_MANAGER;
        address SETTLE_MANAGER;
        address FEE_DISTRIBUTOR;
        address BTC_OPTIONS_TOKEN;
        address ETH_OPTIONS_TOKEN;
        address FAST_PRICE_EVENTS;
        address FAST_PRICE_FEED;
        address POSITION_VALUE_FEED;
        address SETTLE_PRICE_FEED;
        address SPOT_PRICE_FEED;
        address VIEW_AGGREGATOR;
        address REFERRAL;
        address PRIMARY_ORACLE;

        address KP_OPTIONS_MARKET;
        address KP_POSITION_PROCESSOR;
        address KP_PV_FEEDER_1;
        address KP_PV_FEEDER_2;
        address KP_SPOT_FEEDER_1;
        address KP_SPOT_FEEDER_2;
        address KP_FEE_DISTRIBUTOR;
        address KP_CLEARING_HOUSE;
        address KP_SETTLE_OPERATOR;
    }
    bytes32 constant internal _ARBITRUM_ONE = keccak256(abi.encodePacked("ARBITRUM_ONE"));
    bytes32 constant internal _ARBITRUM_SEPOLIA = keccak256(abi.encodePacked("ARBITRUM_SEPOLIA"));
    bytes32 constant internal _BERACHAIN_BARTIO = keccak256(abi.encodePacked("BERACHAIN_BARTIO"));
    bytes32 constant internal _BERACHAIN_CARTIO = keccak256(abi.encodePacked("BERACHAIN_CARTIO"));

    mapping(uint256 => AddressSet) public addressBook;
    
    function getAddressBook(string memory _chainName) public pure returns (AddressSet memory) {
        bytes32 chainNameHash = keccak256(abi.encodePacked(_chainName));
        if (chainNameHash == _ARBITRUM_ONE) {
            return AddressSet(
                {
                    DEPLOYER: 0xAf1b670ba27a0A5b18f57F29f0436C61e3C70641,
                    PROXY_ADMIN: 0x09967AaCBE1D760d6C44823480fa50e884ef1733,
                    WBTC: 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f,
                    WETH: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1,
                    USDC: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
                    SAFE_DEPLOYER: 0xfDFd54E45A80aFc506D0807Ffc9b5919Ca087A77,
                    OPTIONS_AUTHORITY: 0x14B44D35b5992C9d5Ef6922ff9823eB80B31C452,
                    VAULT_PRICE_FEED: 0x3c70425836a5e87eBFd5Ce27b065ff0D6Aae2628,
                    OPTIONS_MARKET: 0x2e8c0aE9503C43FB2d545cfE0bC704baC58ACf1d,
                    S_VAULT: 0x157CF8715b8362441669f8c89229bd6d4aa3EE92,
                    M_VAULT: 0x0DB7707a3188D28300f97E3c4a513630106eD192,
                    L_VAULT: 0x8aBd3F9a4047FB959F3089744DBaAec393aD2e09,
                    S_VAULT_UTILS: 0x0370594163A5c2a68b9AB10ee78c26349Ce6FD79,
                    M_VAULT_UTILS: 0x4eb1A0f502D0d613D184eBa9753e570B9FBeADA4,
                    L_VAULT_UTILS: 0x75d212dE5260715c83bc8f1e3b9f3A87Bb58E7C9,
                    CONTROLLER: 0xe886D83CDfdcd22AF5be952667c466Ad65d042Fb,
                    S_USDG: 0xE978AF4d1A5846dF4FDCa2F39aAE391a4481ecff,
                    M_USDG: 0xfFC29cbC121A025139cAc468A956D0fdb2f9CC70,
                    L_USDG: 0x503e5388BB83AD9D3eb9FeCab92355FEa517e20b,
                    S_OLP: 0x3A630c2Ab413a00426FF6F20726ab252D073359F,
                    M_OLP: 0xc44805E6f6550A7AC3094771287aD1963b2F2e3b,
                    L_OLP: 0xa84fb5697AF169Dfe5EF1f7579015843c413125b,
                    S_OLP_MANAGER: 0x0893C039c296C97d4235C3aAF39D011613596196,
                    M_OLP_MANAGER: 0xA2Ac5c36FE53724596D9bf1729C9EaF3BE492157,
                    L_OLP_MANAGER: 0x86C2D98669b25E83794012Ef73e2b84AFa24B4D9,
                    S_REWARD_TRACKER: 0xe8B06d92F79EA7e98d0a65060A1BB44B5035d3cE,
                    M_REWARD_TRACKER: 0x56De134E4137a777594969ef6971234e321AfA17,
                    L_REWARD_TRACKER: 0x7A92425f1C047219593b21c63C1bFc3a41EC8622,
                    S_REWARD_DISTRIBUTOR: 0x988178D3F1Cd44525dA0Ad80A1106b8EC3435734,
                    M_REWARD_DISTRIBUTOR: 0x15a6F2e210E20bdf0c434A33714628FD203914a1,
                    L_REWARD_DISTRIBUTOR: 0x1724AbA0f8F62a61AF76d42Ae2716544D05FD176,
                    S_REWARD_ROUTER_V2: 0x0E6354aD77D9b7388ED387Bb29DE626002A215EE,
                    M_REWARD_ROUTER_V2: 0xc9701fF02b696B7f71C13a26005568e339B4de00,
                    L_REWARD_ROUTER_V2: 0x4E0FcadB4c736a58ef5b2e04fFfE8F6a7F55a7a0,
                    POSITION_MANAGER: 0xaf5AB7cCBBFE28576EAa9Fc9183FE1E0078B284c,
                    SETTLE_MANAGER: 0xb96e7891a0A131c7DF90A22a434E49209528fB7c,
                    FEE_DISTRIBUTOR: 0xc3Ff9e0fAE457845073694884d02C074791D77DE,
                    BTC_OPTIONS_TOKEN: 0x8c0c4a7aDCC5961003D5ec7CF395f9E70E1D1249,
                    ETH_OPTIONS_TOKEN: 0x601AAf9F290aFF7750B8087999526f50166deBA1,
                    FAST_PRICE_EVENTS: 0xBEEED38990B54BA7291fDfA7F1Ee1e135e306786,
                    FAST_PRICE_FEED: 0xa9AB9e9B3d8F6fa0c8Ca7f5a6520Ab51A7B518D1,
                    POSITION_VALUE_FEED: 0xA93D3A711533ecE8F9c541ea8aE6Cc1A500BAfB3,
                    SETTLE_PRICE_FEED: 0x5Ade9De50d8cd6D4DD51621a675DcEEaf3c9F4fE,
                    SPOT_PRICE_FEED: 0x8dC5cf57783375d554D1cB22dd8341F3f4196143,
                    VIEW_AGGREGATOR: 0xE77Cb1128F62daD2CC3586551D6B3C3C61B055FA,
                    REFERRAL: 0x68a1E85F1cdf335FE07F86601Ca59b5A59240515,
                    PRIMARY_ORACLE: 0xeF0a886A93afaEa2d7A20013E9445a08DAD71f67,
                    
                    KP_OPTIONS_MARKET : 0xC41104131e3573bdd6BE8970be628297daCF2C1A,
                    KP_POSITION_PROCESSOR: 0x2EE028b905FA07bC4e4912c36aEeF56750DB5fb8,
                    KP_PV_FEEDER_1 : 0xe1B0aB189C8FE8193a86d6667b8acA8EA0cd91FE,
                    KP_PV_FEEDER_2 : 0x3f26B27204C1DA3e2c10981e564E669c357AcE2a,
                    KP_SPOT_FEEDER_1: 0x7672Acd9Ac70EFde090438F360dB3A1152126180,
                    KP_SPOT_FEEDER_2: 0x2095aF1dc23d32a3742eb3607fD2C082163f4Eec,
                    KP_FEE_DISTRIBUTOR : 0xEBF3b5E563b2e4E8f711CD89Bb6A7b0d34263803,
                    KP_CLEARING_HOUSE : 0xB3AAF99B3F4a13AC82e5aEdf3Ca89F0e19b7E95B,
                    KP_SETTLE_OPERATOR: 0x171C6B30ca8d184793Be669617e2121a6e91aEaf
                }
            );
        } else if (chainNameHash == _ARBITRUM_SEPOLIA) {
            return AddressSet(
                {
                    DEPLOYER: 0x9B4C9cCc79C52063b8B23E69b71F63D616C6b095,
                    PROXY_ADMIN: address(0),
                    WBTC: 0x7f908D0faC9B8D590178bA073a053493A1D0A5d4,
                    WETH: 0xc556bAe1e86B2aE9c22eA5E036b07E55E7596074,
                    USDC: 0x1459F5c7FC539F42ffd0c63A0e4AD000dfF70919,
                    SAFE_DEPLOYER: 0x0000000000000000000000000000000000000000, // TODO: fixme
                    OPTIONS_AUTHORITY: 0x1cA8a02ad7D36848524F86A0558813B5Be39cF55,
                    VAULT_PRICE_FEED: 0x0f80775eDEC46Cd687d83d7AeABba45106BAC56b,
                    OPTIONS_MARKET: 0xe9135D6F772a22cB6584BC39c8081F40aA3a24B9,
                    S_VAULT: 0x18C34A7Db31Ed648A7665e5Fb9D167967362E8c1,
                    M_VAULT: 0x624a4d0b1bd542c3751040f42dE4beD6Dc3d5329,
                    L_VAULT: 0xbc08aC2f8Fae2f2ccAe93F9a8a31041208A31301,
                    S_VAULT_UTILS: 0xAa262bC7099aFE3eF5F59818981396F200645CF0,
                    M_VAULT_UTILS: 0x8B122e24B8Da75697eCec6BFeDA1888b41bFc465,
                    L_VAULT_UTILS: 0x084E7016D35f474FbD3A981A507b842d9fB5FeEa,
                    S_USDG: 0x4f036BEf9b5103D6497749E5C2378eCbA77C15e9,
                    M_USDG: 0x259500DC6FDb2Ce2cf510867BB3557205575E508,
                    L_USDG: 0x825Dec8FF2c832F5b5B1F6942583f1c422F2BB00,
                    S_OLP: 0xEbFCc94f552f73a21c691860DD586C5033BF59ac,
                    M_OLP: 0x93b29879f0B962d3A655Dbcc788b2b32848F91e3,
                    L_OLP: 0xD2660D4F6E30A4dA739B51CEdD33F6404405C421,
                    S_OLP_MANAGER: 0x2860d641aC5C8447Be9B6aDE6B2A119be36Ac34b,
                    M_OLP_MANAGER: 0xa0C28c7d27979D14928936508CB4707fae6831a8,
                    L_OLP_MANAGER: 0xd9084eD62d86f5E25b62834EaC4EA9a280567DC5,
                    S_REWARD_TRACKER: 0x1710FbCd5F40e39fC42F0740A9337C648661b493,
                    M_REWARD_TRACKER: 0x188534f84DbA45F31110e17152d316A3fcda43ED,
                    L_REWARD_TRACKER: 0x77215cfad85329F06226EF18DFcB47387DbE43db,
                    S_REWARD_DISTRIBUTOR: 0xFC23D2A9Ee57B9bfFaFF83Ad72DFb297AAa59919,
                    M_REWARD_DISTRIBUTOR: 0xcb5176552d17eBA3E0B8efD9C4F31e05Be6e002b,
                    L_REWARD_DISTRIBUTOR: 0x882412Ba5c79b1F0d2fB2225a292071e0C072248,
                    S_REWARD_ROUTER_V2: 0x215A8dec241660534f38E0e0cc1139a9B6Ed9f82,
                    M_REWARD_ROUTER_V2: 0x8473e07325e19D35160f7962B713bAa02cAf6741,
                    L_REWARD_ROUTER_V2: 0x6A513B7Ab3e5c37a1E1BE706d3f095129746B46e,
                    CONTROLLER: 0xEe9A9de1D11d59Ceb61671BeF5830e2AAd69fc57,
                    POSITION_MANAGER: 0xdA3D966384Aac23f4A912A1C77bd91A674666a8F,
                    SETTLE_MANAGER: 0xF5eDC9fFAf45eEFa0808D26097ED7440fEB96C71,
                    FEE_DISTRIBUTOR: 0x141c476c76445cC62e73c0d366Fa217f481939ce,
                    BTC_OPTIONS_TOKEN: 0x7eec5C6Cd2C2b134d39664A910335Da3E9A045Ef,
                    ETH_OPTIONS_TOKEN: 0x87b379Df9bE273B1B8F06870bFC1f162D37683Dc,
                    FAST_PRICE_EVENTS: 0x682b7d4389Cc018a8e9651A1185d6ca0Cc220f21,
                    FAST_PRICE_FEED: 0x6Ff1D50448199e842De9d650CE990ae259F7C7aA,
                    POSITION_VALUE_FEED: 0xAb4Ca38857936F0693354c8b95E3aD933844bb03,
                    SETTLE_PRICE_FEED: 0x0AB1E640c7Fcb371bE1b687e605449D5718a02D1,
                    SPOT_PRICE_FEED: 0xbFe0e9ce401141e5f1898de6fa02ecDE91420585,
                    VIEW_AGGREGATOR: 0x6E1652D70078d2572564be74dA6fEbad389C5927,
                    REFERRAL: 0x87AeD0608bC4f9C71FE0F68B4470d4059229ab42,
                    PRIMARY_ORACLE: address(0),

                    KP_OPTIONS_MARKET : address(0),
                    KP_POSITION_PROCESSOR: 0xe0aAe4BEb0c2e3e1559C015b5FF0036CD1525a52,
                    KP_PV_FEEDER_1 : address(0),
                    KP_PV_FEEDER_2 : address(0),
                    KP_SPOT_FEEDER_1: 0x83E3eEf640dBE3fBbE0dbf5BD7676bf79cD02e75,
                    KP_SPOT_FEEDER_2: address(0),
                    KP_FEE_DISTRIBUTOR : address(0),
                    KP_CLEARING_HOUSE : address(0),
                    KP_SETTLE_OPERATOR: 0x4ccEDA21ca2d0Db271E63Fe943d6c15131ef00Cf
                }
            );
        } else if (chainNameHash == _BERACHAIN_BARTIO) {
            return AddressSet(
                {
                    DEPLOYER: 0x9B4C9cCc79C52063b8B23E69b71F63D616C6b095,
                    PROXY_ADMIN: address(0),
                    WBTC: 0x2577D24a26f8FA19c1058a8b0106E2c7303454a4,
                    WETH: 0xE28AfD8c634946833e89ee3F122C06d7C537E8A8,
                    USDC: 0xd6D83aF58a19Cd14eF3CF6fe848C9A4d21e5727c,
                    SAFE_DEPLOYER: 0x0000000000000000000000000000000000000000, // TODO: fixme
                    OPTIONS_AUTHORITY: 0x428642F2deC312175a5ad564f9A51A0D3736D0f3,
                    VAULT_PRICE_FEED: 0xa65fb1e29B770dA20f2afd7Ac3930EEcc67F132C,
                    OPTIONS_MARKET: 0x798996410c7d14b8D51614A3De13AcD2A579efFb,
                    S_VAULT: 0x7f908D0faC9B8D590178bA073a053493A1D0A5d4,
                    M_VAULT: 0xc556bAe1e86B2aE9c22eA5E036b07E55E7596074,
                    L_VAULT: 0x1459F5c7FC539F42ffd0c63A0e4AD000dfF70919,
                    S_VAULT_UTILS: 0x50599966F4aF26B29a563Ab70b95B7Fb69D49b67,
                    M_VAULT_UTILS: 0x1F2843EF34749824a51F47B57F51C06cd588e7F0,
                    L_VAULT_UTILS: 0x61d75f1f879153e064d11E1bF047802e8af99cab,
                    S_USDG: 0x38E2bD95c9fc0179c36c0798Ac6556bF2b14BB02,
                    M_USDG: 0xCb5212B68776AF5E885fBE0Fb6E93974549d4942,
                    L_USDG: 0x4186F8868048935A7766714804b843B297c223Ea,
                    S_OLP: 0x7B1efA40708DA01c3a70f5d6E836B2A22dF1619b,
                    M_OLP: 0x98b2311DEaAAe72A19e882f9E6b231713533248f,
                    L_OLP: 0x49684cdcb19fCd2B84497108eC01991241464276,
                    S_OLP_MANAGER: 0xB71Be70Bb0EE3c5b20e7205E11497Abddd7c4a72,
                    M_OLP_MANAGER: 0xC91DAA8B41B6389dB4114a4BE1C77143A8708FA8,
                    L_OLP_MANAGER: 0xEC04F69cec0b9E56d50209c19B8bD7ec464fE062,
                    S_REWARD_TRACKER: 0xcFa0Ca5bFf1C13E0631ED0d78074BB60627b6304,
                    M_REWARD_TRACKER: 0xFefBcB29bD747390543aF96b1209249A4D0F05Dd,
                    L_REWARD_TRACKER: 0xe3Df0af7245B3CaA8f67Cc6968AbB9450001e90b,
                    S_REWARD_DISTRIBUTOR: 0x87d2Bc496068d78F3F614c9424334C678311ED31,
                    M_REWARD_DISTRIBUTOR: 0x6e00a72b53Cb52141C49fB13Aa9f3a14a7B1307C,
                    L_REWARD_DISTRIBUTOR: 0xc8635ab7cB28206AA6d33dCDaD876e05DB771a76,
                    S_REWARD_ROUTER_V2: 0x169Fc6c6c7ED89B8100C85E5a22662F7DAe32177,
                    M_REWARD_ROUTER_V2: 0x3772984adD362e92b6AEa095F7bdd9FD9Eb6073F,
                    L_REWARD_ROUTER_V2: 0x4BAb3934C80eaee82Bd78e80f3557d836ECb8Bd8,
                    CONTROLLER: 0x13707339fCaf422Cc60366928DD3ca1eB013b1e2,
                    POSITION_MANAGER: 0x6861dB8E5CF2c33b207B6BDf0c89204A05734930,
                    SETTLE_MANAGER: 0x3E75690B3f36Bb1FAf441C604A029B9EF8B1e1AF,
                    FEE_DISTRIBUTOR: 0xBF2e8DCFaf5E5a47FdED03a20EBC60551f0C6FD3,
                    BTC_OPTIONS_TOKEN: 0x5032ab062a3Ec1510ff327A73b78B8539621fB7B,
                    ETH_OPTIONS_TOKEN: 0xd88457dBAE6B447E66692e3Da741A0260f8622dB,
                    FAST_PRICE_EVENTS: 0x29d99B1F12E55f92D4b15fB5eE8375E586990AAD,
                    FAST_PRICE_FEED: 0x5Dc73DfD1b60f0CF9e8B8c57B09bB796C045EE3E,
                    POSITION_VALUE_FEED: 0x590896a6eFfCa7857696E2E7f027B30C35ca0Ef7,
                    SETTLE_PRICE_FEED: 0x2444Df6311596735770eEB41D15b82A1B4bFDC38,
                    SPOT_PRICE_FEED: 0xb8bBD05803d2d169A88439364CD7F6D7F96eb277,
                    VIEW_AGGREGATOR: 0x10c0D06f474F4cC9f2e1E4467B23A54B9D34E36b,
                    REFERRAL: 0x198864A20Bfb092549B3e7Ee9AA76E4978aAFcd6,
                    PRIMARY_ORACLE: address(0),

                    KP_OPTIONS_MARKET : address(0),
                    KP_POSITION_PROCESSOR: 0xe0aAe4BEb0c2e3e1559C015b5FF0036CD1525a52,
                    KP_PV_FEEDER_1 : address(0),
                    KP_PV_FEEDER_2 : address(0),
                    KP_SPOT_FEEDER_1: 0x83E3eEf640dBE3fBbE0dbf5BD7676bf79cD02e75,
                    KP_SPOT_FEEDER_2: address(0),
                    KP_FEE_DISTRIBUTOR : address(0),
                    KP_CLEARING_HOUSE : address(0),
                    KP_SETTLE_OPERATOR: 0x4ccEDA21ca2d0Db271E63Fe943d6c15131ef00Cf
                }
            );
        } else if (chainNameHash == _BERACHAIN_CARTIO) {
            return AddressSet(
                {
                    DEPLOYER: 0x9B4C9cCc79C52063b8B23E69b71F63D616C6b095,
                    PROXY_ADMIN: address(0),
                    WBTC: 0xFa5bf670A92AfF186E5176aA55690E0277010040,
                    WETH: 0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3,
                    USDC: 0x015fd589F4f1A33ce4487E12714e1B15129c9329,
                    SAFE_DEPLOYER: 0x0000000000000000000000000000000000000000, // TODO: fixme
                    OPTIONS_AUTHORITY: 0xB9b5F9b13F845C99fb1761abDB566D57A486A3a0,
                    VAULT_PRICE_FEED: 0xf04F75e66D0591D4CD64AC5a2446E95F363A988b,
                    OPTIONS_MARKET: 0x52Ab39e83b8093833501b21467E9B4629Da5CeEc,
                    S_VAULT: 0xd8cCa38b504190dc38cf53fb6C5a755049f63578,
                    M_VAULT: 0x593EA7ff745758f2CDf3495C53CDb2112d0DF113,
                    L_VAULT: 0x4c2bA26276FDf499f9EFC583c31Feb3737AE20c4,
                    S_VAULT_UTILS: 0x41f0537bcbf3446A33843cF328Bc22457f33380c,
                    M_VAULT_UTILS: 0xCD78DF7c8039c9DA748B4a3346ebB95E8F909d53,
                    L_VAULT_UTILS: 0x8ce84D5F76805E124755fb5392A1CA842F19367B,
                    S_USDG: 0x95027eB9B51aE5e1Cd51dFf82d5FFbFF08ee65aF,
                    M_USDG: 0xE6DfC41fEe544970c408D75a9c2b6D96290D39a3,
                    L_USDG: 0xBE2c339cEBb0E0314f7d425ECA8a27bc73fABf24,
                    S_OLP: 0xD9964af64E673239182a1E886A23c4EC4F0E73d9,
                    M_OLP: 0x0D292151a2D894d1449Bfb39C23f5b392BDECE69,
                    L_OLP: 0x842c29295e22562d4FAeaa1cA4eFd9C993c9c486,
                    S_OLP_MANAGER: 0x8E04685CE557DD670A231eA312873488eBaf309D,
                    M_OLP_MANAGER: 0x37066AC2037BF34A863D28A31DbC7CCE77cf3877,
                    L_OLP_MANAGER: 0x93cC4358FaA202aBD60F3B705b5940B01a6a6b07,
                    S_REWARD_TRACKER: 0x99b6CA82Ac7a076434F38347b163ac51c62B0b1f,
                    M_REWARD_TRACKER: 0xbE7E7eBEEa596689d0580168EfD6D04A08AC6730,
                    L_REWARD_TRACKER: 0xF970B6604C1fC2Bd476A10CE88A50Daf38a5bF2E,
                    S_REWARD_DISTRIBUTOR: 0x8fBb22Cf3245e8aeBe1162E677A96C49F01840EC,
                    M_REWARD_DISTRIBUTOR: 0xF6058dA71Da5a5Ec82EcBE56350bb8A0DCE40515,
                    L_REWARD_DISTRIBUTOR: 0x20f9df3F0bE9d85bD1eBfe6dD159A3Db28c44BBE,
                    CONTROLLER: 0x89b44B3008624F3362AC8dd2BbCeAd33cD2AAb99,
                    S_REWARD_ROUTER_V2: 0xFa33Ce5F6533cfC2b480C9B137E34De4c94bEDAA,
                    M_REWARD_ROUTER_V2: 0x8B3434264fe8b81bE97e69838633977594F4ED83,
                    L_REWARD_ROUTER_V2: 0x7eA308E295888F94E53816567AdD865011b51B20,
                    POSITION_MANAGER: 0x4c2f5faC82525616eeAB03F8f59fC090Ae5384d3,
                    SETTLE_MANAGER: 0xC18eE5283aDfD7b9688c97c74c0aF2AD819f2dD8,
                    FEE_DISTRIBUTOR: 0x3114028aAc32E9605e941c857Ec29fF5fD74689D,
                    BTC_OPTIONS_TOKEN: 0xF68e07627B607fb8c42159003d24918ECF4FB466,
                    ETH_OPTIONS_TOKEN: 0xE14ed89f902254fA178E9dC6D183F12ab6c91E40,
                    FAST_PRICE_EVENTS: 0xe0A8f78E7B47438058bF42Df5b6209a9f5724fe8,
                    FAST_PRICE_FEED: 0x55B1a59FF7f5F6F4FF4cBFb1f438F4c55b9C5B53,
                    POSITION_VALUE_FEED: 0x2F1B470fC074F5fdE19B9f6C02F1Fc99967FB396,
                    SETTLE_PRICE_FEED: 0x9D56c0b09CB3A0eE4A6d8a61cB747D03A28A8264,
                    SPOT_PRICE_FEED: 0x378a5a29A91814cF606340d82cc01555d134d1d6,
                    VIEW_AGGREGATOR: 0x668Aa0A9112489a0CBEDC12CC1DC8F4a44FEfFD1,
                    REFERRAL: 0x0a458eea46B5eB781fE67e1d51dAbdA4729de732,
                    PRIMARY_ORACLE: address(0),

                    KP_OPTIONS_MARKET : address(0),
                    KP_POSITION_PROCESSOR: 0xe0aAe4BEb0c2e3e1559C015b5FF0036CD1525a52,
                    KP_PV_FEEDER_1 : address(0),
                    KP_PV_FEEDER_2 : address(0),
                    KP_SPOT_FEEDER_1: 0x83E3eEf640dBE3fBbE0dbf5BD7676bf79cD02e75,
                    KP_SPOT_FEEDER_2: address(0),
                    KP_FEE_DISTRIBUTOR : address(0),
                    KP_CLEARING_HOUSE : address(0),
                    KP_SETTLE_OPERATOR: 0x4ccEDA21ca2d0Db271E63Fe943d6c15131ef00Cf
                }
            );
        } else {
            return AddressSet(
                {
                    DEPLOYER: address(0),
                    PROXY_ADMIN: address(0),
                    WBTC: address(0),
                    WETH: address(0),
                    USDC: address(0),
                    SAFE_DEPLOYER: 0x0000000000000000000000000000000000000000, // TODO: fixme
                    OPTIONS_AUTHORITY: address(0),
                    VAULT_PRICE_FEED: address(0),
                    OPTIONS_MARKET: address(0),
                    S_VAULT: address(0),
                    M_VAULT: address(0),
                    L_VAULT: address(0),
                    S_VAULT_UTILS: address(0),
                    M_VAULT_UTILS: address(0),
                    L_VAULT_UTILS: address(0),
                    S_USDG: address(0),
                    M_USDG: address(0),
                    L_USDG: address(0),
                    S_OLP: address(0),
                    M_OLP: address(0),
                    L_OLP: address(0),
                    S_OLP_MANAGER: address(0),
                    M_OLP_MANAGER: address(0),
                    L_OLP_MANAGER: address(0),
                    S_REWARD_TRACKER: address(0),
                    M_REWARD_TRACKER: address(0),
                    L_REWARD_TRACKER: address(0),
                    S_REWARD_DISTRIBUTOR: address(0),
                    M_REWARD_DISTRIBUTOR: address(0),
                    L_REWARD_DISTRIBUTOR: address(0),
                    S_REWARD_ROUTER_V2: address(0),
                    M_REWARD_ROUTER_V2: address(0),
                    L_REWARD_ROUTER_V2: address(0),
                    CONTROLLER: address(0),
                    POSITION_MANAGER: address(0),
                    SETTLE_MANAGER: address(0),
                    FEE_DISTRIBUTOR: address(0),
                    BTC_OPTIONS_TOKEN: address(0),
                    ETH_OPTIONS_TOKEN: address(0),
                    FAST_PRICE_EVENTS: address(0),
                    FAST_PRICE_FEED: address(0),
                    POSITION_VALUE_FEED: address(0),
                    SETTLE_PRICE_FEED: address(0),
                    SPOT_PRICE_FEED: address(0),
                    VIEW_AGGREGATOR: address(0),
                    REFERRAL: address(0),
                    PRIMARY_ORACLE: address(0),

                    KP_OPTIONS_MARKET : address(0),
                    KP_POSITION_PROCESSOR: address(0),
                    KP_PV_FEEDER_1 : address(0),
                    KP_PV_FEEDER_2 : address(0),
                    KP_SPOT_FEEDER_1: address(0),
                    KP_SPOT_FEEDER_2: address(0),
                    KP_FEE_DISTRIBUTOR : address(0),
                    KP_CLEARING_HOUSE : address(0),
                    KP_SETTLE_OPERATOR: address(0)
                }
            );
        }
    }
}

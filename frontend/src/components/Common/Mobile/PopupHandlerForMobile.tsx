import { useContext, useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import { shortenAddress } from "@/utils/helper";
import { ModalContext } from "../ModalContext";
import MainPopupForMobile from "./MainPopupForMobile";

import IconDirectMessageBadge from "@/assets/icon-direct-message-badge.png";

const VIP_LIST: string[] = [
  "0xbc1798b0f494584f8dbe9a94205fc32a5446deac",
  "0x36ba09b6d77b49fab174aa1e97a7c0677476eabd",
  "0xcd55002a5a295a746bac55da82400edda8e3ba27",
  "0xd0d9b4ad7d1951858bd7be52e3b7bb53e6100f0c",
  "0x79374fdf37d880354c89cbdb89a50c4471aee336",
  "0x566339480990eadee8f30153785e580df875e2bd",
  "0x1848d26f76c8f8ab416f8aaf064506d9d77183ff",
  "0x1f75beaa5b8f611a1c678a79a763fed0af140349",
  "0x4e9c104d24ca8aa27c3e1a5d9d3249e96c5bbd80",
  "0xefe139ecee9b787ae4329814058003e81a3a40c1",
  "0xea32a33300d64bddb9f09a8308d44c23616ec706",
  "0x0f52e336647f48c2c252f91cea2dc9b4e72f88f0",
  "0x14cff5a34109f9696d32c5842baf018016870751",
  "0x2d5830b16f7d9dbdc12024bc6df011859920f320",
  "0x93f9eacdd2aa5268b358600a9f9d1b2d07a1dd2a",
  "0x361a7f7d3927fb3182bb0fa4c1c172f4bac25196",
  "0x1da57512bb2cc82a031ebb445a83a8831c69bf73",
  "0x5a4ffcf5e16076f0d0dd5916e4858abce3bbf1bc",
  "0x507e2135da72698044a8e6ff042324a18d73597b",
  "0x9b7d7c4ce98036c4d6f3d638a00e220e083116c7",
  "0xf0259de4b474a5d9e2e2b227626b50b0769de08f",
  "0xda1480828d9efeb694da1809b1bb251cf5eb7441",
  "0x1e742285cc17bad26a307b4c781c96d29f0b3c21",
  "0xc23816d5c97ccf07f57e8701859d6b524e5a320c",
  "0x0566d52171036546de97d797da1ee35088ea182e",
  "0x6a6f34b1314e5532d0aaac6cb7c1a081ab1862ea",
  "0xea16545cf2e4c30b38b156cda0972be63ce71d50",
  "0xcb11673592cc6c4b9584f33bbba6c6cf07dde3f7",
  "0xae93d0f9a886351a245ea129a6b2de82ba32243a",
  "0xce2d4bbcdf0f0f514ea2bfb9c2a6873670769934",
  "0x22da5f0fcd956384dcd07155138aa8e8c0df3d45",
  "0x220b522979B9F2Ca0F83663fcfF2ee2426aa449C",
  "0x38280B86C66788EdA4637033074C2c0fF18552ef",
  "0xE9C9b648B899E1662faB21E983725eD3f299F4e9",
  "0xabf47ac2DFa7112977fa22D55590eBd351C3Aefe",
  "0x313e2223436e151C6B4167c63a5e0324aC8FbcED",
  "0xcd48347AFBF0Db796955497bB3370Cef512994a7",
  "0x507E2135DA72698044a8E6FF042324a18D73597B",
  "0x47655c3b13dd14a54f8ae3cf17cfda12f7f91cd7",
  "0xf64242972e116b4ca713efa590730e3741589016",
  "0x6760ff558c1db2231eb2cf1d16de05b01231193e",
  "0x2d760d867ebebd7da5b0be18fed71b4bcc9610eb",
];

const PB = {
  // "0xbc1798b0f494584f8dbe9a94205fc32a5446deac": {	bonusPoint: 500, pointBoost: 20 },
  "0x9bb5e797d08943ae6eee802bfa9dfd4d279ee98f": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xcb11673592cc6c4b9584f33bbba6c6cf07dde3f7": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x1831a43d43ae3fdd321cadd6b745b2a75746bc66": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xce2e67709418b452d8fcd36a502af27bde7d4d56": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xd0fab6bd0f8eab8fb8a4fefc2fb60cb87abb8f5e": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xe0f1a6494ee81864a2bb84e31d7f252342b90476": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xb7a9fb1920f55ad9c90f588ccad3c8b0c560f77f": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x5a4ffcf5e16076f0d0dd5916e4858abce3bbf1bc": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x361a7f7d3927fb3182bb0fa4c1c172f4bac25196": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xda1480828d9efeb694da1809b1bb251cf5eb7441": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x24e32bb964721dfac9dee9e9ff71ac476652e8ef": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x4b1f0d892d12040e7b45af2682b9a85c134f8241": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x1921ab331ef86d144ecae672dd7a2de985f2fd15": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x484de6813ed85da863c5735ba710c2b971fcbc88": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x38ace85e8473a653a85ca397f1255a0ce40b0283": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x5845748d92a1dab0c670847d0f8d70c7b377c2b2": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xbaef27fecc1cf99ce6ecdcd795daaf758cf8daf8": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xe2f9e9b2b5579b61ba18e038f70eb0b3882ddbc5": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x5195e491b4e620505995717f575489c2e3e0e593": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x871b6e605230c16697cc1c94d49dd9804edeab99": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xde685245241f82435bbf4535d94196a37ad29fb8": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xdd2cf358428c3cc794372c13361ef1e15a26a172": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x51fc339d57541ed05fe5a88a6c970373c733edbc": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xbf7b02df420520d07c0aa1f67706f142b2bc0a0a": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x50def0950a3bec00dd5945b221c0d8981a63557c": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x05b5d413e8350460ce37c40c41f98b4a37e7a241": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x6e1e9701bee5f23fbb9a22f5e7c0c18e09f6ec2d": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x6eb1076b0174ab13c981a0c2f3a1fa83a3e215c0": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x06f07090afdf5deceab8c434e324adc07a7b0376": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x4316d175db9b7bcc6edd00513f0389dfa967bd77": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xe06cc74a01d2585c457020f20755dd6afb885e9b": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x55e36f90b8ffca6dae79d67025f0e3fb5516a991": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x91ac7b6d9a19ba7372c7f7e7560f22d788187af5": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xd4e6362e225cc4a978b62ffd474336a9195ddc69": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x4e9c104d24ca8aa27c3e1a5d9d3249e96c5bbd80": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x2d1a0f69ea53d61b4f74648ca1db523610784406": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x90a35db755e709ea9061e188f4b51ac524ffc542": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x562c66a423846f4d37fe5f9ce856c0fd19bb28ca": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xa627f9282423f7b295ff389dfecf5f398b2d6c82": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x843e8a63b337a79d65af2713b3f2c33c589759a6": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x90eb355a85ea5324529224945bb55f1960da1b47": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xb7b1a0ff66840ce7c70d21ad561644564b20fbcf": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x79374fdf37d880354c89cbdb89a50c4471aee336": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x47809e1bc7e681a894ed7435aeac6516ec73bf3b": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0xb6835c6dec78892d2b5f83b3f2ae7f855ca1728b": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x7f302ef4e8beac25fc20a4cf5fa1d2e881870656": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x566339480990eadee8f30153785e580df875e2bd": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x94c71d1780ff80e6154f9e885132bb9d3c207ffd": {
    bonusPoint: 500,
    pointBoost: 20,
  },
  "0x1da57512bb2cc82a031ebb445a83a8831c69bf73": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x311cbe88373d3d0d4fcf9e16ec05d76a97bb6746": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x1848d26f76c8f8ab416f8aaf064506d9d77183ff": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x7525af9498280da3fc2f5498c495e89561b8ee79": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x412182e674c8990b12c5e87cedae5c9322989f0e": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xff7f1d257e57608d7c10f4da7652f43a5a93d389": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x2ab71800de8e00fe547f171b23379b536bab069e": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xe2be30f2aced76f5f9cc7ffaaff5cfe20f6e728c": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x66d65d064b46b336c76654542254c3557057e257": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xdedead90de1fe4a015cd3788d9f152b13444b1fb": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x5535c48511faa34bc3666f385b9b3ab93a65f845": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x17b64ba679e095ac87a400b6f6ac8cd591b517f9": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x3410fc9be30981101ecd2093671ae442d5573492": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xd8bdcc794b8e1c25ba07617dbfbe9c6c649c2d22": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xb5b4cd6291622a6d7ad44ba4857a5ef3e32ed9bb": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x0d5d0801d6880168451c960df68d54e37fad8af9": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x259f6697454c95e325d208014acd659449887ba8": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x128bb969c39234a5187f23dcf57984a247fb5a43": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x35059e74521c8620470e8389b0db3fa5b3bd86bf": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x756411397dcb94653ae165bb6ccb831b263e3473": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x8b3040ba6fe013355624ebd5303ec4fef4cb1dcc": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x6fcec02c4d643e14ccf54f70b4ba2cddb31272c9": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xbdd62eef4b2dbbde70c3bee04c5cf95f7350e51e": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xb60e2ea3b5e3211a793ecd3bb970a0428999ec7e": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x0f29a89363bafdb7a264e4177862654f1c30943b": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x2a632a82f8f3180307fd5f566cfb85b112dd573c": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xa79cecac92886488e27063181a8da92c3ee2fc11": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xeaa0d56331e480fc9b4ed820c00404ec1e9d52c7": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x33d0079d8b0b946bffa5a3179fcf76cf0c23d84b": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x36650bc6afa7707d073578f6a47c20f3fdb10e74": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x122fd69942595d0910712d0b18b199320da91dba": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x3d658c7cfc7fbe34146ba27bf11e47ab3311de1c": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xbcb06cc79108c66b3b456349364ee0c1da74779d": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x53603a6c3a252ebb5be521f0c5e5ec1ac39733ee": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xc10cdd915912978df64755e71ba2d8e48149511a": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xde5967cbffc481782fe7d69d4ea0f12837e615f7": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x8b5fdde74b547459ea6805a817b3dd0808a2894c": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xcc432fbb19438c874943bdd109add103c31086b2": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x8a8414d3f155dd7183f912608c96204ff5dd20d5": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x04a6d944e5e31c98c122509028008c3fb23840d5": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x5539d9f9e35edf51001ba9c84dee9289cf2cc621": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xd24af6ee358879ff1e70ed75406a7f8ea7531f25": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x0bd7867f477834c27a3ff096198d2aed090fe8ac": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x1ff157adffc164918b88a90a877d6b889eeea43b": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x545bada1ba54b8a5a3f1bef3ec075e8af45e2f36": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x3d7fdc85da5b6e33b1790e2146ad370aec70a09a": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x32b636cda43b62eb08dcc0d3e78000af21860f46": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x6f28c4a9324fdde6fbcc9f7bb20664b8bd30071e": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x6c39ad22e62c468dc3a0a2658384f2dbe070b05c": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x3038d6266e67bfe863f9a99c2177119506ac8800": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x279eadbb335a532343adac50c6204dfe0f1a22af": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x48f064ce3b1af3d7f6394130b8cdb7f78f7fef1b": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x00dde048f25899297f747a71ff5c087580428101": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x1a80ad5260fc349efeb79ac21ab286648cc53b26": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x25fafb2ad1566ba482e8b4f10be58f5d58ed7566": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x176be66e4a0fe8fa93ef742014381912669dba83": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x6901e216c988280197a125b034d9b9ad3666ce5d": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x51f5021fd70facee2174f1fb78cee956670101b4": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x84fb3eceb454d9e6a2b178d864a2fe5a0761abde": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x8f51d83ae3b97a5cd38b39cd6b2b3fdd2a5816d8": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xc419bc6d946c5f9e9dc1991f6ee3b401169645c8": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x74c857d9db9849135d3cec15af73ccd803ff281b": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xb8eae19f8891aebe01d02d8094bf9bca70e4dc42": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xe13ca3c4ee871b75970e1b8e132b3552631a5367": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xc5911e844e80245f2ae6bdcb39146b8b9c2954f1": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xcdb03eeb8e288fa2b174f2efcf8d63dd345af193": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xcff5719c7b0aee015a5d9c932de8b49227ea93a2": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xfea71d5a1717ae4c8d2bcd15bb0825a1279c5745": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x6830d8a48bec7abd6f84f42a71f5a08d5e0a67df": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x7bf7abea7bf72aa2ab0353a937d2cda3f0c3a55e": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x6d456d357ac967fdd96d071021fc0c4df8baa219": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x615f3ffd7b9840f874de2cbb8f1ab944eeb168ee": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xd17c6b8bf05405b8808cabb0d3b9e700b687ec41": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x7e13870bc99dfc7c4fc9976f6c5c21bddef5d76e": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x590139313792c80fdf858db594bd3866f8e4d61a": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x4f5f3c1e2ee90eef3036b3bf3794df5c69594fab": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x491a5040160a91af6d4cab7e045572ed1c677fe4": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xdd7ae040895f6476188f7f99e6ae3261e79f9fd3": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xe83d0942b873e019a17c2a908b100d1051387ca3": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xf3f155adf8580a36e95bebefc8790b7c23a5145c": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xb8e2747799e38f4fe58fadb64d6b2d022e46fc71": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x25d7783655071a0e4096e523ab1a89ae18e71cc1": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x938c8e1179bfa4e6418a92d00f9e29afc182917e": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xd5b08339d90012ac3d24eebc263b8731b468bda0": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x26df4519c752573aaafb467109bdb02e26fd1527": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x3119e012c0add628ceba1a5ff35159de17428e6e": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xd4145bf265883622e9db56564f4510c0e95b01e1": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x0999810269ae5503e068c51c709d7f5959210b74": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xea21d70505b0dd0877891fb72e55aa883220f60e": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xadbd5b31167e5a742daa8b5c26b6a26e4854ecfc": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xd632d690f435cb29e97b69781823f21bfa34aaa0": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x8a363b6860e11e311168de74a16544d8c8dd9905": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x9d78e11753ba03056c6dea937e68d9380ca56728": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x8edb9648fbff0c7c205c2db2f2b359318fc6b858": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x6e48b3b583affcdee58f649f2ec5aff9220f834f": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xfaa43457f5bed9e96040842fc3e887284295cd08": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xfb68432e3fd357c334d08fa95996c1894c775e7b": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x5b0eb8f3e1d6dc8b781a96d0970f995221fd4d25": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xf9b1320ed395abc5e486112ce3c68ca890dcd00b": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xd7fd49adb38d1d7fd9568d96a5414b722e97bb4e": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x03965e8626eab76ec094f0eb60f5ed64582b7b6f": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0xab769309ebceeda984e666ab727b36211ba02a8a": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x459172ba4399d790d527378e74e5a19bad35f490": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x662bbb1f3a4ac797bcfb37defeb8f1bf13de223a": {
    bonusPoint: 750,
    pointBoost: 30,
  },
  "0x22da5f0fcd956384dcd07155138aa8e8c0df3d45": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0xae93d0f9a886351a245ea129a6b2de82ba32243a": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0x36ba09b6d77b49fab174aa1e97a7c0677476eabd": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0xf8bc58b556403dcc4d05e3fd67e052f9324869ca": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0x656043c240b7722810ddd339cc4f6daaae436f53": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0xff6da047c0e428f4e2a5d688b96b4ba2662ec2af": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0xd0eb787a913c41d4eedacc32b08771b89db7a7de": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0xdfa7671bd325412cb2d5e7199ebc79f882bbf6a1": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0x59e40752be0f745b63ff918089743ca8dfb04151": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0xa5c0ac1b11a9da27af7e6aabbf6eb497917eb145": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0x04e7913b5186bbd5a738e096177e20473464d326": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0x3eada457690661775e560a2285594363c9be1364": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0xa641bfbf23340d5014d50a674a02cf193a694870": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0x0bbaf32bc6f843042a0082cc822a6add6d636c3e": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0x2d5830b16f7d9dbdc12024bc6df011859920f320": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0x093615032936fe291e9e18be0743a4143a295e8a": {
    bonusPoint: 1000,
    pointBoost: 40,
  },
  "0xb5c8b97ad275d7dd58d79ff7662ec2c7021b9096": {
    bonusPoint: 1500,
    pointBoost: 60,
  },
  "0xefe139ecee9b787ae4329814058003e81a3a40c1": {
    bonusPoint: 1500,
    pointBoost: 60,
  },
  "0x87e312c3c5e3f91714c8b5462128400eb92c609d": {
    bonusPoint: 1500,
    pointBoost: 60,
  },
  "0x7631440207d223a55c55e41c8f8ee28569f959c6": {
    bonusPoint: 1500,
    pointBoost: 60,
  },
  "0xc9ee309b4739823e511dab7d5e2702a9b6084bf5": {
    bonusPoint: 1500,
    pointBoost: 60,
  },
  "0xd511332c76b8000122cfbe2baca81639a57503fc": {
    bonusPoint: 1500,
    pointBoost: 60,
  },
  "0x6b09754eb84e0c92555303ee474381c44c84afd0": {
    bonusPoint: 1500,
    pointBoost: 60,
  },
  "0xe693c2cf3bc992077e6619b98d7a92c72b2c0f40": {
    bonusPoint: 1500,
    pointBoost: 60,
  },
  "0x397ff79f1f79d6fbcb469f0493fb636a956ba613": {
    bonusPoint: 1500,
    pointBoost: 60,
  },
  "0xa1b1797ec33aaae268d8c8dc6475af6f5d4089ed": {
    bonusPoint: 1500,
    pointBoost: 60,
  },
  "0x9bc8130233193142d8dedcbdf256cd638be3a6ea": {
    bonusPoint: 1500,
    pointBoost: 60,
  },
  "0x21a2af72c548f716fbcbde53dba38880dcb9b316": {
    bonusPoint: 1500,
    pointBoost: 60,
  },
  "0xc4e2604b3ecd2fe097866361421541858b1c858d": {
    bonusPoint: 1500,
    pointBoost: 60,
  },
};

const PopupHandlerForMobile: React.FC = () => {
  const { address } = useAccount();
  const { openModal } = useContext(ModalContext);

  const [isModalClosed, setIsModalClosed] = useState<boolean>(false);
  const [isPB, setIsPB] = useState<boolean>(false);
  const [shouldSendDM, setShouldSendDM] = useState<boolean>(false);

  useEffect(() => {
    const shouldModal =
      !localStorage.getItem("callput:mainPopup:hideUntil") ||
      Number(localStorage.getItem("callput:mainPopup:hideUntil")) < new Date().getTime();

    if (shouldModal) {
      openModal(<MainPopupForMobile />, {
        contentClassName: "flex flex-col min-h-[300px]",
      });
    } else {
      setIsModalClosed(true);
    }
  }, []);

  useEffect(() => {
    if (!isModalClosed) return;

    const isVIP = address
      ? VIP_LIST.map((addr) => addr.toLowerCase()).includes(address.toLowerCase())
      : false;

    const isPB = address ? Object(PB).hasOwnProperty(address.toLowerCase()) : false;

    setIsPB(isPB);

    const shouldDM =
      isVIP || isPB
        ? !localStorage.getItem(`shouldDm.${address}`) ||
          localStorage.getItem(`shouldDm.${address}`) === "true"
        : false;

    setShouldSendDM(shouldDM);
  }, [isModalClosed, address]);

  if (!shouldSendDM) return <></>;

  return (
    <div className="z-40 fixed bottom-[88px] right-[36px]">
      <div
        className={twJoin(
          "flex items-start gap-[24px] sm:w-[600px] p-[24px] rounded-[4px]",
          "border-greenc1 border-[1px]",
          "bg-[#1f1f1f] bg-cover bg-center bg-no-repeat bg-[url('./assets/bg-direct-message.svg')]",
          "animate-directMessageIn",
          isPB ? "sm:h-[220px]" : "sm:h-[192px]"
        )}
      >
        <div className="flex flex-row w-[91px] justify-between items-center">
          <img className="w-full" src={IconDirectMessageBadge} />
        </div>

        <div className="flex flex-col sm:w-[430px]">
          <p className="h-[22px] text-[18px] font-bold">
            Dear <span className="text-greenc1">{shortenAddress(address)}</span>
          </p>
          <p className="sm:h-[60px] mt-[8px] text-[14px]">
            Thank you for being part of our journey from the start! <br />
            We warmly invite you to become a member of{" "}
            <span className="text-greenc1 font-bold">Moby Pioneer.</span> <br />
            Join the Moby Pioneer and don't miss Bonus{" "}
            <span className="text-greenc1 font-bold">Points & Limited Events!</span>
          </p>
          <div className="flex flex-row justify-end items-center h-[32px] mt-[22px] gap-[28px]">
            <p
              className="cursor-pointer text-[12px] text-[#999] font-semibold"
              onClick={() => {
                localStorage.setItem(`shouldDm.${address}`, "false");
                setShouldSendDM(false);
              }}
            >
              Don't show this message again
            </p>
            <div
              className="cursor-pointer flex flex-row justify-center items-center px-3 sm:w-[180px] h-full rounded-[16px] bg-greenc1"
              onClick={() => {
                window.open("https://forms.gle/vjBDnJyvFcDEZNyu7", "_blank");
                localStorage.setItem(`shouldDm.${address}`, "false");
                setShouldSendDM(false);
              }}
            >
              <p className="text-[12px] font-bold text-center text-black12">Accept Invitation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopupHandlerForMobile;

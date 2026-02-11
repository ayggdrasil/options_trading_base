import { useAppDispatch, useAppSelector } from './store/hooks'
import TradingV2 from './pages/TradingV2'
// import Trading from './pages/Trading'
import Pools from './pages/Pools'
import ZeroDte from './pages/ZeroDte'
import { loadEpochStages, loadOlpApr, loadOlpMetrics } from './store/slices/AppSlice'
import { loadMyPositions } from './store/slices/PositionsSlice'
import {
  loadAllowanceForController,
  loadAllowanceForPool,
  loadBalance,
  loadTradeData,
  loadTwitterInfo,
  loadVolumeData
} from './store/slices/UserSlice'
import {loadLeadTraders, loadMarketData, loadSettlePrices} from './store/slices/MarketSlice'
import { loadMyOlpPnl, loadMyOlpQueue } from './store/slices/OlpQueueSlice'
import { loadEpochInfo } from './store/slices/OlpEpochSlice'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useLayoutEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { ModalProvider } from './components/Common/ModalContext'
import { ModalRoot } from './components/Common/ModalRoot'
import FootBar from './components/FootBar/FootBar'
import ToastContainer from './components/Common/ToastContainer'
import Rewards from './pages/Rewards'
import ReferralHandler from './components/Common/ReferralHandler'
import { START_WEBSOCKET, STOP_WEBSOCKET } from './store/actions/actionTypes'
import PopupHandler from './components/Common/PopupHandler'
import NavBar from './components/NavBar/NavBar'
import AnnouncementBarManager, { AnnouncementData } from './components/Common/AnnouncementBarManager'
import AnnouncementHandler from './components/Common/AnnouncementHandler'
import NavBarForMobile from './components/NavBar/Mobile/NavBarForMobile'
import PopupHandlerForMobile from './components/Common/Mobile/PopupHandlerForMobile'
import HeaderForMobile from './components/Home/Mobile/HeaderForMobile'
import AnnouncementBarManagerForMobile from './components/Common/Mobile/AnnouncementBarManagerForMobile'
import HomeForMobile from './pages/HomeForMobile'
import TradingForMobile from './pages/TradingForMobile'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { changeDevice } from './store/slices/DeviceSlice'
import ZeroDteForMobile from './pages/ZeroDteForMobile'
import PoolsForMobile from "./pages/PoolsForMobile";
import { NetworkState } from './networks/types'
import MobileNotSupported from './components/Common/MobileNotSupported'

import './streams/store'

function App() {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(false);
  
  const dispatch = useAppDispatch();
  const { address } = useAccount();
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  // responsive design
  useEffect(() => {
    const handleMediaForMobileChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };
    const handleMediaForIpadChange = (event: MediaQueryListEvent) => {
      setIsIpad(event.matches);
    };

    const mediaQueryListForMobile = window.matchMedia("(max-width: 1024px)");
    mediaQueryListForMobile.addEventListener(
      "change",
      handleMediaForMobileChange
    );
    const mediaQueryListForIpad = window.matchMedia(
      "(min-width: 768px) and (max-width: 1024px)"
    );
    mediaQueryListForIpad.addEventListener("change", handleMediaForIpadChange);

    // Run the function immediately to update the state on component mount
    handleMediaForMobileChange(
      mediaQueryListForMobile as unknown as MediaQueryListEvent
    );
    handleMediaForIpadChange(
      mediaQueryListForIpad as unknown as MediaQueryListEvent
    );
    return () => {
      mediaQueryListForMobile.removeEventListener(
        "change",
        handleMediaForMobileChange
      );
      mediaQueryListForIpad.removeEventListener(
        "change",
        handleMediaForIpadChange
      );
    };
  }, []);

  // connect to websocket
  useEffect(() => {
    dispatch({ type: START_WEBSOCKET });

    return () => {
      dispatch({ type: STOP_WEBSOCKET });
    }
  }, [dispatch])

  // load common data
  useEffect(() => {
    dispatch(loadSettlePrices());

    const interval = setInterval(() => {
      dispatch(loadSettlePrices());
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [])

  // load chain specific data
  useEffect(() => {
    dispatch(loadVolumeData(chain));
    dispatch(loadMarketData(chain));
    dispatch(loadOlpApr(chain));
    dispatch(loadOlpMetrics(chain));
    dispatch(loadEpochStages(chain));

    const interval = setInterval(() => {
      dispatch(loadVolumeData(chain));
      dispatch(loadMarketData(chain));
      dispatch(loadOlpApr(chain));
      dispatch(loadOlpMetrics(chain));
      dispatch(loadEpochStages(chain));
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, [chain])

  // load user specific data
  useEffect(() => {
    dispatch(loadTradeData({chain, address}));
    dispatch(loadMyPositions({chain, address}));
    dispatch(loadMyOlpQueue({chain, address}));
    dispatch(loadMyOlpPnl({chain, address}));
    dispatch(loadEpochInfo({chain}));
    dispatch(loadBalance({chain, address}));
    dispatch(loadAllowanceForController({chain, address}));
    dispatch(loadAllowanceForPool({chain, address}));
    dispatch(loadTwitterInfo({chain, address}));
    dispatch(loadLeadTraders(chain));

    const interval = setInterval(() => {
      dispatch(loadTradeData({chain, address}));
      dispatch(loadMyPositions({chain, address}));
      dispatch(loadMyOlpQueue({chain, address}));
      dispatch(loadMyOlpPnl({chain, address}));
      dispatch(loadEpochInfo({chain}));
      dispatch(loadBalance({chain, address}));
      dispatch(loadAllowanceForController({chain, address}));
      dispatch(loadAllowanceForPool({chain, address}));
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [address, chain])

  useEffect(() => {
    const initialAnnouncements: AnnouncementData[] = [
      // {
      //   id: '1',
      //   content: (
      //     <div className='flex flex-row items-center'>
      //       <p>
      //         0DTE, dashboard, and point system are available on{' '}
      //         <span className='cursor-pointer text-[#12AAFF] underline' onClick={() => handleSwitchNetwork({
      //           name: SupportedChains.BASE
      //         })}>
      //           Base
      //         </span>{' '}
      //         only. They will be supported on Arbitrum One shortly.
      //       </p>
      //     </div>
      //   ),
      //   supports: [SupportedChains.ARBITRUM_ONE],
      //   isCheckable: true,
      // }
    ];

    setAnnouncements(initialAnnouncements.filter(announcement => {
      const hideUntil = localStorage.getItem(`callput:announcementBar:${announcement.id}:hideUntil`);
      const isSupported = announcement.supports.includes(chain);

      if (!isSupported) return false;
      if (hideUntil && Number(hideUntil) > Date.now()) return false;

      return true;
    }));
  }, [chain]);

  const handleCloseAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  // Mobile Related
  const [isMobile, setIsMobile] = useState(window.matchMedia("(max-width: 1024px)").matches);
  const [isIpad, setIsIpad] = useState(window.matchMedia("(min-width: 768px) and (max-width: 1024px)").matches);
  const [headerHeight, setHeaderHeight] = useState<number>();
  const { connectModalOpen } = useConnectModal();

  useEffect(() => {
    dispatch(changeDevice({ isIpad, isMobile }));
  }, [isIpad, isMobile]);

  // Update style and add events for connect wallet modal
  useLayoutEffect(() => {
    if (!isMobile || !connectModalOpen) {
      return;
    }
    let observer: MutationObserver;

    const modalContentEl = document.querySelector(
      "div[aria-labelledby='rk_connect_title'] > div > div > div > div > div"
    ) as HTMLDivElement | null;

    if (modalContentEl) {
      let touchStartY: undefined | number;

      const updateClass = () => {
        const getWalletBtn = modalContentEl.querySelector(
          "div:nth-child(2) > div > div:nth-child(4) button"
        );

        if (getWalletBtn) {
          modalContentEl.classList.add("wallet-modal__connect");
          modalContentEl.classList.remove("wallet-modal__get");
        } else {
          modalContentEl.classList.add("wallet-modal__get");
          modalContentEl.classList.remove("wallet-modal__connect");
        }
      };

      // Get and create element
      const closeButton = modalContentEl.querySelector(
        "div > div > div > div > div > button"
      ) as HTMLButtonElement | null;
      const closeBar = document.createElement("div");

      // Update elements class
      modalContentEl.classList.add("wallet-modal");
      closeButton?.classList.add("close-button");
      closeBar.classList.add("close-bar");
      updateClass();

      // Add events
      closeBar.addEventListener("touchstart", (e) => {
        touchStartY = e.touches?.[0]?.clientY;
      });

      modalContentEl.addEventListener("touchend", (e) => {
        if (
          typeof touchStartY === "number" &&
          e.changedTouches?.[0]?.clientY > touchStartY
        ) {
          closeButton?.click();
        }
      });

      modalContentEl.appendChild(closeBar);

      observer = new MutationObserver(() => {
        updateClass();
      });

      const config = { childList: true, subtree: true };
      observer.observe(modalContentEl, config);
    }

    return () => {
      observer?.disconnect();
    };
  }, [connectModalOpen, isMobile]);

  return  (
    <ModalProvider>
      <BrowserRouter>
          {/* <RestrictedCountryHandler /> */}
          <AnnouncementHandler
            showAnnouncementModal={showAnnouncementModal}
            setShowAnnouncementModal={setShowAnnouncementModal}
          />
          <ReferralHandler />
          <ScrollToTop />

          {isMobile
            ? <MobileNotSupported />
            // ? <>
            //     <NavBarForMobile />
            //     {/* <PopupHandlerForMobile /> */}
            //     <Routes>
            //       <Route
            //         path="/"
            //         element={
            //           <>
            //             <HeaderForMobile setHeaderHeight={setHeaderHeight}>
            //               <AnnouncementBarManagerForMobile
            //                 announcements={announcements}
            //                 handleCloseAnnouncement={handleCloseAnnouncement}
            //               />
            //             </HeaderForMobile>
            //             <HomeForMobile headerHeight={headerHeight} />
            //           </>
            //         }
            //       />
            //       <Route path="/trading" element={<TradingForMobile />} />
            //       {/* <Route path="/0dte" element={<ZeroDteForMobile />} /> */}
            //       <Route path="/pools" element={<PoolsForMobile />} />
            //       <Route path="*" element={<Navigate to="/trading" replace />} />
            //     </Routes>
            //   </>
            : <>
                <NavBar />
                <AnnouncementBarManager announcements={announcements} handleCloseAnnouncement={handleCloseAnnouncement} />
                {/* <PopupHandler /> */}
                <Routes>
                  <Route path="/" element={<TradingV2 announcementsLen={announcements.length} />} />
                  {/* <Route path="/trading" element={<Trading announcementsLen={announcements.length} />} /> */}
                  <Route path="/trading" element={<TradingV2 announcementsLen={announcements.length} />} />
                  {/* <Route path="/boyco" element={<Boyco announcementsLen={announcements.length} />} /> */}
                  {/* {<Route path="/0dte" element={<ZeroDte announcementsLen={announcements.length} />} />} */}
                  <Route path="/pools" element={<Pools announcementsLen={announcements.length} />} />
                  {/* <Route path="/rewards" element={<Rewards announcementsLen={announcements.length} />} /> */}
                  {/* <Route path="/position-manager" element={<PositionManager />} /> */}
                  <Route path="*" element={<Navigate to="/trading" replace />} />
                </Routes>
                <FootBar chain={chain} />
              </>
          }
          <ToastContainer />
          <ModalRoot isMobile={isMobile} />
      </BrowserRouter>
    </ModalProvider>
  )
}
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default App


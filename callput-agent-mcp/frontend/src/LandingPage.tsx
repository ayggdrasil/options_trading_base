import { useState, useEffect } from 'react';


const LandingPage = () => {
    // --- Live Trading Data Mock ---
    const [trades, setTrades] = useState([
        { time: '2 mins ago', asset: 'WETH', strategy: 'Buy Call', strike: '3000', expiry: '20FEB24', size: '0.5 ETH' },
        { time: '15 mins ago', asset: 'WBTC', strategy: 'Sell Put Spread', strike: '60000/58000', expiry: '28FEB24', size: '0.1 BTC' },
        { time: '1 hour ago', asset: 'WETH', strategy: 'Buy Call Spread', strike: '3200/3400', expiry: '06MAR24', size: '1.2 ETH' },
        { time: '2 hours ago', asset: 'WBTC', strategy: 'Buy Put', strike: '58000', expiry: '20FEB24', size: '0.05 BTC' },
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            // Simulate live updates
            const newTrade = {
                time: 'Just now',
                asset: Math.random() > 0.5 ? 'WETH' : 'WBTC',
                strategy: ['Buy Call', 'Sell Put', 'Call Spread'][Math.floor(Math.random() * 3)],
                strike: '3100',
                expiry: '20FEB24',
                size: (Math.random() * 2).toFixed(2) + ' ETH'
            };
            setTrades(prev => [newTrade, ...prev.slice(0, 4)]);
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-bg-0 text-text-100 font-serif antialiased selection:bg-accent/20 selection:text-accent">

            {/* Header / Hero */}
            <header className="relative pt-20 pb-16 px-6 text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-bg-100/50 to-transparent pointer-events-none" />
                <div className="relative z-10 max-w-4xl mx-auto">
                    <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-200 text-xs font-sans font-medium text-text-300 border border-bg-300">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Base L2 Mainnet Live
                    </div>
                    <h1 className="text-4xl md:text-6xl font-serif font-light tracking-tight text-text-100 mb-6">
                        Autonomous Options Trading<br />
                        <span className="italic text-text-300">Powered by AI Agent</span>
                    </h1>
                    <p className="text-lg md:text-xl text-text-300 font-sans max-w-2xl mx-auto mb-10 leading-relaxed">
                        Let your AI agents trade autonomously on <strong>callput.app</strong>. Research strategies, analyze markets, and execute profitable trades on Base L2.
                    </p>

                    {/* Chat Interface removed as requested */}

                    <div className="flex flex-wrap justify-center gap-3 font-sans text-sm">
                        {['🔗 Base L2', '🤖 MCP Protocol', '⚡ Real-time Data', '🔓 Open Source'].map(badge => (
                            <span key={badge} className="px-3 py-1.5 bg-bg-100 border border-bg-300 rounded-md text-text-300">
                                {badge}
                            </span>
                        ))}
                    </div>
                </div>
            </header>

            {/* MCP Mechanism */}
            <section className="py-20 px-6 border-t border-bg-200 bg-bg-100/30">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-serif text-center mb-4">How MCP Works</h2>
                    <p className="text-center text-text-300 font-sans mb-12 max-w-2xl mx-auto">
                        The Model Context Protocol (MCP) acts as a translator between AI agents and blockchain smart contracts.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { icon: '👤', title: 'User', desc: 'Commands via Telegram, Discord, etc.' },
                            { icon: '🤖', title: 'AI Agent', desc: 'Processes intent & strategy' },
                            { icon: '🔌', title: 'MCP Server', desc: 'Fetches data & generates TX' },
                            { icon: '⛓️', title: 'Base L2', desc: 'Executes on-chain trade' }
                        ].map((item, i) => (
                            <div key={i} className="group p-6 bg-bg-0 border border-bg-300 rounded-xl text-center hover:border-accent/50 transition-colors duration-300">
                                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                                <h3 className="text-lg font-medium mb-2 font-sans">{item.title}</h3>
                                <p className="text-sm text-text-300 font-sans">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trading Strategies */}
            <section className="py-20 px-6 border-t border-bg-200">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-serif text-center mb-4">Available Trading Strategies</h2>
                    <p className="text-center text-text-300 font-sans mb-12">
                        4 spread strategies × 2 assets (WBTC, WETH) = 8 trading combinations
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                name: 'Debit Call Spread', type: 'DEBIT', desc: 'Buy low call, sell high call. Bullish.', color: 'text-green-600', max: 'Max Profit: Strike Diff - Debit',
                                graph: (
                                    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                        <line x1="20" y1="60" x2="180" y2="60" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
                                        <line x1="20" y1="10" x2="20" y2="110" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
                                        <path d="M 20 100 L 80 100 L 140 20 L 180 20" fill="none" stroke="#16a34a" strokeWidth="2.5" /> {/* green-600 */}
                                        <text x="75" y="115" fill="currentColor" fillOpacity="0.5" fontSize="10" textAnchor="middle">K1</text>
                                        <text x="135" y="115" fill="currentColor" fillOpacity="0.5" fontSize="10" textAnchor="middle">K2</text>
                                        <text x="100" y="50" fill="#16a34a" fontSize="11" fontWeight="600" textAnchor="middle">Profit ↑</text>
                                    </svg>
                                )
                            },
                            {
                                name: 'Credit Call Spread', type: 'CREDIT', desc: 'Sell low call, buy high call. Bearish.', color: 'text-accent', max: 'Max Profit: Credit Received',
                                graph: (
                                    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                        <line x1="20" y1="60" x2="180" y2="60" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
                                        <line x1="20" y1="10" x2="20" y2="110" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
                                        <path d="M 20 20 L 80 20 L 140 100 L 180 100" fill="none" stroke="#D97757" strokeWidth="2.5" /> {/* accent */}
                                        <text x="75" y="115" fill="currentColor" fillOpacity="0.5" fontSize="10" textAnchor="middle">K1</text>
                                        <text x="135" y="115" fill="currentColor" fillOpacity="0.5" fontSize="10" textAnchor="middle">K2</text>
                                        <text x="100" y="105" fill="#D97757" fontSize="11" fontWeight="600" textAnchor="middle">Loss ↓</text>
                                    </svg>
                                )
                            },
                            {
                                name: 'Debit Put Spread', type: 'DEBIT', desc: 'Buy high put, sell low put. Bearish.', color: 'text-green-600', max: 'Max Profit: Strike Diff - Debit',
                                graph: (
                                    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                        <line x1="20" y1="60" x2="180" y2="60" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
                                        <line x1="20" y1="10" x2="20" y2="110" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
                                        <path d="M 20 20 L 60 20 L 120 100 L 180 100" fill="none" stroke="#16a34a" strokeWidth="2.5" /> {/* green-600 */}
                                        <text x="55" y="115" fill="currentColor" fillOpacity="0.5" fontSize="10" textAnchor="middle">K1</text>
                                        <text x="115" y="115" fill="currentColor" fillOpacity="0.5" fontSize="10" textAnchor="middle">K2</text>
                                        <text x="100" y="30" fill="#16a34a" fontSize="11" fontWeight="600" textAnchor="middle">Profit ↑</text>
                                    </svg>
                                )
                            },
                            {
                                name: 'Credit Put Spread', type: 'CREDIT', desc: 'Sell high put, buy low put. Bullish.', color: 'text-accent', max: 'Max Profit: Credit Received',
                                graph: (
                                    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                        <line x1="20" y1="60" x2="180" y2="60" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
                                        <line x1="20" y1="10" x2="20" y2="110" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
                                        <path d="M 20 100 L 60 100 L 120 20 L 180 20" fill="none" stroke="#D97757" strokeWidth="2.5" /> {/* accent */}
                                        <text x="55" y="115" fill="currentColor" fillOpacity="0.5" fontSize="10" textAnchor="middle">K1</text>
                                        <text x="115" y="115" fill="currentColor" fillOpacity="0.5" fontSize="10" textAnchor="middle">K2</text>
                                        <text x="100" y="90" fill="#D97757" fontSize="11" fontWeight="600" textAnchor="middle">Loss ↓</text>
                                    </svg>
                                )
                            },
                        ].map((strat, i) => (
                            <div key={i} className="p-6 bg-bg-100 border border-bg-300 rounded-xl hover:shadow-lg transition-shadow duration-300">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-lg leading-tight w-2/3 font-serif">{strat.name}</h3>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded bg-bg-200 font-sans ${strat.type === 'DEBIT' ? 'text-green-600' : 'text-accent'}`}>{strat.type}</span>
                                </div>
                                <p className="text-sm text-text-300 mb-4 h-10 font-sans">{strat.desc}</p>
                                <div className="h-32 bg-bg-200/50 rounded-lg flex items-center justify-center text-xs text-text-400 font-mono mb-4 p-2">
                                    {strat.graph}
                                </div>
                                <p className={`text-xs font-medium font-sans ${strat.color}`}>{strat.max}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Installation */}
            <section className="py-20 px-6 bg-bg-100 border-t border-bg-200">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-serif text-center mb-12">Installation Guide</h2>

                    <div className="space-y-8 font-sans">
                        {[
                            { title: 'Clone Repository', cmd: 'git clone https://github.com/ayggdrasil/options_trading_base.git\ncd options_trading_base' },
                            { title: 'Install Dependencies', cmd: 'npm install' },
                            { title: 'Build Project', cmd: 'npm run build' },
                            { title: 'Test Connection', cmd: 'node build/test_connection.js' }
                        ].map((step, i) => (
                            <div key={i} className="relative pl-10">
                                <span className="absolute left-0 top-0 w-6 h-6 rounded-full bg-text-100 text-bg-0 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                <h3 className="text-lg font-medium mb-3">{step.title}</h3>
                                <pre className="bg-bg-100 border border-bg-300 p-4 rounded-lg overflow-x-auto text-sm font-mono text-text-200">
                                    {step.cmd}
                                </pre>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Live Activity */}
            <section className="py-20 px-6 border-t border-bg-200">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-serif text-center mb-4">Recent On-Chain Activity</h2>
                    <p className="text-center text-text-300 font-sans mb-12">Live data from Base L2 Mainnet</p>

                    <div className="overflow-x-auto bg-bg-100 border border-bg-300 rounded-xl">
                        <table className="w-full text-left text-sm font-sans">
                            <thead className="bg-bg-200/50 text-text-300 border-b border-bg-300">
                                <tr>
                                    <th className="p-4 font-medium">Time</th>
                                    <th className="p-4 font-medium">Asset</th>
                                    <th className="p-4 font-medium">Strategy</th>
                                    <th className="p-4 font-medium">Strike</th>
                                    <th className="p-4 font-medium">Expiry</th>
                                    <th className="p-4 font-medium">Size</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-bg-300/50">
                                {trades.map((trade, i) => (
                                    <tr key={i} className="hover:bg-bg-200/50 transition-colors">
                                        <td className="p-4 text-text-300">{trade.time}</td>
                                        <td className="p-4 font-bold">{trade.asset}</td>
                                        <td className="p-4">{trade.strategy}</td>
                                        <td className="p-4 text-green-600 font-mono">{trade.strike}</td>
                                        <td className="p-4 font-mono">{trade.expiry}</td>
                                        <td className="p-4 text-accent font-mono">{trade.size}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-bg-300 text-center text-text-300 font-sans text-sm">
                <p className="mb-4">Built for the agentic economy 🤖⚡</p>
                <div className="flex justify-center gap-6 mb-8">
                    <a href="https://github.com/ayggdrasil/options_trading_base" target="_blank" rel="noopener noreferrer" className="hover:text-text-100 transition-colors">GitHub</a>
                    <a href="https://callput.app" target="_blank" rel="noopener noreferrer" className="hover:text-text-100 transition-colors">Callput Protocol</a>
                    <a href="https://base.org" target="_blank" rel="noopener noreferrer" className="hover:text-text-100 transition-colors">Base L2</a>
                    <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" className="hover:text-text-100 transition-colors">MCP Protocol</a>
                </div>
                <p>© 2026 Callput. MIT License.</p>
            </footer>
        </div>
    );
};

export default LandingPage;

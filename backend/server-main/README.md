## Overview

Server-main processes data and provides APIs necessary for CallPut operation, independent of associated chains. The server operates on port 3000 and consists of three main modules for handling various financial data processing tasks.

<br/>

## Modules

### IV-Curve Module
> Optimized IV curve generation using mark price data from multiple exchanges

- ### Data Sources
  - Deribit
  - OKX
  - Bybit

- ### IV Data Processing
  1) Fetches and saves mark iv information for all options from data sources `> interaval: 20 seconds`
  2) Generate optimized IV curves for our product by using SVI calculation formula and applying exchange-specific weighted calculation `> interval: 20 seconds`

<br/>

### Market-Index Module
> Comprehensive market data processing for futures and spot prices

- ### Data Sources
  - Deribit
  - Binance
  - Bitfinex

- ### Futures Data Processing
  1) Fetches and saves current futures index from data sources `> interval: 1 second`
  2) Generate optimized futures index for our product by applying exchange-specific weighted calculation `> interval: 1 second`

- ### Spot Data Processing
  1) Fetches and saves current spot index from data sources `> interval: 30 seconds`
  2) Generate optimized spot index for our product by applying exchange-specific weighted calculation `> interval: 30 seconds`

<br/>

### RF-Rate Module
> Calculates and optimizes RF-rates based on futures data

- ### Data Sources
  - Deribit
  - OKX
  - Bybit

- ### RF-Rate Data Processing
  1) Fetches and saves futures information from data sources `> interval: 30 minutes`
  2) Generate optimized RF rate for our product based on exchange averages `> interval: 1 hour`

<br/>

## Additional Features

### Error Handling
- Implements global filter for centralized error management
- Integrated Slack notifications for error alerts


### Database Integration
- Supports both Redis and PostgreSQL
- Modular structure for each database type

### Slack Integration
- Implemented Slack modules and services for notifications
- Integrated with error handling system

<br/>

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE)
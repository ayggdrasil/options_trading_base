import { MONTHS_MAP_REV } from "./constants";

export function parseExpiry(expiry: string): number {
  const matches = expiry.match(/^(\d+)([A-Z]{3})(\d{2})$/);
  if (!matches) {
    throw new Error(`Invalid expiry format: ${expiry}`);
  }

  const day = matches[1].padStart(2, '0');
  const month = MONTHS_MAP_REV[matches[2].toUpperCase()];
  const year = "20" + matches[3];

  if (!month) {
    throw new Error(`Invalid month: ${matches[2]}`);
  }

  const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day}T08:00:00Z`;
  return new Date(isoDate).getTime();
}

export const getDaysToLeft = (instrument: string) => {
  const [symbol, expiryString, strikePrice, callPut] = instrument.split('-')
  const expiryTimestamp = parseExpiry(expiryString)
  
  return (expiryTimestamp - new Date().getTime()) / 1000 / 86400
}

export const getChartCenterPoint = (bepPoint: number, strikePrice: number) => {
  const centerPoint = (bepPoint + strikePrice) / 2
  return centerPoint
}

export const getDefaultChartHoverPoint = (
  chartData: any[],
  bepPoint: number, 
  daysToExpiry: number, 
  isCall: boolean, 
  isLong: boolean
) => {

  let defaultPointCandidate = 0

  if (daysToExpiry <= 30) {
    switch (true) {
      case isCall && isLong:
      case !isCall && !isLong:
        defaultPointCandidate = bepPoint * (1 + 0.10)
        break
      case isCall && !isLong:
      case !isCall && isLong:
        defaultPointCandidate = bepPoint * (1 - 0.10)
        break
    }
  } else {
    // > 30
    switch (true) {
      case isCall && isLong:
      case !isCall && !isLong:
        defaultPointCandidate = bepPoint * (1 + 0.25)
        break
      case isCall && !isLong:
      case !isCall && isLong:
        defaultPointCandidate = bepPoint * (1 - 0.25)
        break
    }
  }


  // find chartData point X that is closest to defaultPointCandidate with reduce function
  const defaultPoint = chartData.reduce((acc, cur) => {
    const [curX, curY] = cur
    const [accX, accY] = acc
    const curXDiff = Math.abs(curX - defaultPointCandidate)
    const accXDiff = Math.abs(accX - defaultPointCandidate)

    if (curXDiff < accXDiff) {
      return cur
    } else {
      return acc
    }
  }, [0, 0])

  return { x: defaultPoint[0], y: defaultPoint[1] }
}

export const dataToCanvasPosition = ({
  chartWidth,
  chartHeight,
  chartStartX,
  chartStartY,
  dataMinX,
  dataMinY,
  dataMaxX,
  dataMaxY,
  xData,
  yData,
}: any) => {
  const xRatio = chartWidth / (dataMaxX - dataMinX)
  const yRatio = chartHeight / (dataMaxY - dataMinY)

  const adjustedX = chartStartX + (xData - dataMinX) * xRatio
  const adjustedY = chartStartY + (yData - dataMinY) * yRatio

  const xPos = adjustedX
  const yPos = adjustedY

  return { xPos, yPos }
}

export const isSameAddress = (a: string, b: string) => String(a).toLowerCase() === String(b).toLowerCase()

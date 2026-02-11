import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";
  
const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/spreadsheets',
  credentials: {
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDL8t/SSgqM6l9e\n6G75aElZij5RkJYv+5dvlvGUaFOWVmb3p3Li/kt0zdrdRCWsHnDMRkIsmqw2rEse\nlp65V6QL4KVLu/4iYOzYesVzeuRkk3yUkVP0WN2o+8CuN3e/m4M5UQysxgVXTjaU\nvOwi8R1zom5wFZInGGESIKl3NVMRKp+ostPyMj0ZtMX1+J3+1t2y8KQt6BNamuFk\nSwPcaMDwuVKMW9f7ARew1XT6lhZrSosiB4++OjT69sV1V8BEdfpKeprFRN4VtInI\n2e5W4KgetGMGc+IK3Jxy6XwOOANGl5vZZL579sdGTRhXuLs25Muey/2ljOgBaPtA\nXsiL6rtRAgMBAAECggEAFT1a0ZJ+wnR+xdUMsvJelTHK/Kvt9YWiR0T1LWtSAoRG\ns+r0kYRB2ne9H9xYKgfU38k/XK19BYfwSM651/vdwejoKK4lhhy0Ux/cuVfmj5I2\nirMPMbwhgCw7wZ5Vh8G2gFJwW1FCFCNj7B3itQmJnisf4jy03FfIdYlWQhZua16R\nLQubSXKEk/ku3wTRJyTX9gCFcTyu1OZSsr7YUZVzBddctaqEX+YzhLUonfAQHUdj\n7fmAlbOv9Gfs/3t4V2MeL09KJPEBSpGXteXKuSKY4Hhka5m+hgKHJ7+4NBT2ET+J\nX/42vQeDIzqrx5AHmJVa5PtkUehKH32jgHoB9oKMswKBgQDxzlTX2lFpqFfkJGSu\n19u7UCnBQMwLCd/HCAhVAcsLK5qSXTTw/E1QQN9UDRoTtdsmY66GQ+aviLdr44jH\nsh4JmSUmmhassKpuLsJiOvbsQxxakFSoVoR2SwEXKsnN1Ya8pxgDkc/6kgJ2/9c3\nrQ5TWLe/jPWJqHd/Vyr/RhlKAwKBgQDX66dx1fvLHcdGGHrqfxgfz1BcyxW3TPsB\n0J82pImyBVHdxVhfyYAO60HDqoNRBPVr4aVGy9CxYjkyJUX49VXmSXF0lckn4JiS\niOAn1V99kQrbK6SoBOj8t7gV1Bb3GfL5Id/A9o6w8gMjo1390Tr0idVODp3BnW+f\n4ITOaSNPGwKBgQC5ViTBrZxpF5cGTr69JMZOtArNDRVYAKF8tDNutIkkbq9zL+28\nKCY6NP74NXKfWOw4aH8Eelb+hBPSpfvY1DUhtjg7di+a/W4kNcLX98n7HRVGdQnu\nXSH6aVLUpv82vUsgnhJR6hk3PWKWQ1J6YjJwv7dXInuwn2e4Ot/B+cC4cQKBgQC2\n2wYiHJKxcBWLoj2uC1YV0k7/VqmcYyALaG79KpjF30V2Z6Mw84d0mv1FxEiTO3zQ\nEPcUHpUtM762XeSFMte9P6NKlXMWR1lOd4ZFlajZwRSNicdW11msc7X9HnEYcKxZ\nGbvRQbyT01CfRMHbqu6fm36+LRiimD6pCc3OtDFH0wKBgQDKxPQEkFHd6ZTJ/Yz6\nrRetPiRjTdGjH+ikmKo6oygBFA80yVgEhpSs9p/kQyGOgwf5cveSBQqlhx0QoiSi\nReNn4Ry1XNdiB3wHDWW0vDnjys6sQqWH9lQxudsapOQbwihUyTL0KbHhQ4dzpJPV\ntgDsUXlADsI2FIijyHp6d2MoYQ==\n-----END PRIVATE KEY-----\n",
    "client_email": "callput-sheet-writer@plenary-atrium-484116-k1.iam.gserviceaccount.com",
  },
})

export const appendValues = async (range, values) => {

  const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
  
  const service = google.sheets({version: 'v4', auth});
  const resource = { values }

  try {
    const result = await service.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: resource,
    })

    console.log(`${result.data.updates.updatedCells} cells appended.`);
    return result;
  } catch (err) {
    // TODO (developer) - Handle exception
    throw err;
  }
}
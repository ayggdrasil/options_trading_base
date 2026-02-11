export const addEventToData = (data: any, event: string) => {
  const parsedData = JSON.parse(data);

  return JSON.stringify({
    event,
    ...parsedData,
  });
};

export const getEffectiveReadUserId = (req) => {
  if (
    typeof req?.viewAsUserId === 'number'
    && Number.isSafeInteger(req.viewAsUserId)
    && req.viewAsUserId > 0
  ) {
    return req.viewAsUserId;
  }

  return req?.user?.id;
};

export default getEffectiveReadUserId;

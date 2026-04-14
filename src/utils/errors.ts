export function getApiErrorMessage(error: unknown, fallback: string) {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data;

  if (typeof responseData === 'string' && responseData.trim().length > 0) {
    return responseData;
  }

  if (responseData && typeof responseData === 'object') {
    const message = (responseData as { message?: unknown }).message;
    if (Array.isArray(message)) {
      const firstMessage = message.find(
        (item): item is string => typeof item === 'string' && item.trim().length > 0,
      );
      if (firstMessage) return firstMessage;
    }
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }

    const errorText = (responseData as { error?: unknown }).error;
    if (typeof errorText === 'string' && errorText.trim().length > 0) {
      return errorText;
    }
  }

  const genericMessage = (error as { message?: unknown })?.message;
  if (typeof genericMessage === 'string' && genericMessage.trim().length > 0) {
    return genericMessage;
  }

  return fallback;
}

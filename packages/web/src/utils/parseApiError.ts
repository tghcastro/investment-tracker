interface ApiErrorBody {
  message?: string;
  fields?: Record<string, string[]>;
}

async function readApiErrorBody(response: Response): Promise<ApiErrorBody | null> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

export async function parseApiErrorResponse(response: Response): Promise<string> {
  const body = await readApiErrorBody(response);
  if (!body?.message) {
    return `Request failed (${response.status})`;
  }

  const fileMessages = body.fields?.file;
  if (response.status === 400 && fileMessages?.[0]) {
    const fieldMessage = fileMessages[0];
    if (fieldMessage !== body.message) {
      return `${body.message}: ${fieldMessage}`;
    }
  }

  return body.message;
}

export async function parseApiMutationError(
  response: Response
): Promise<{ error: string; fieldErrors: Record<string, string[]> | null }> {
  const body = await readApiErrorBody(response);
  if (response.status === 400 && body?.fields) {
    return {
      error: body.message ?? 'Validation failed',
      fieldErrors: body.fields,
    };
  }
  if (body?.message) {
    return { error: body.message, fieldErrors: null };
  }
  return { error: `Request failed (${response.status})`, fieldErrors: null };
}

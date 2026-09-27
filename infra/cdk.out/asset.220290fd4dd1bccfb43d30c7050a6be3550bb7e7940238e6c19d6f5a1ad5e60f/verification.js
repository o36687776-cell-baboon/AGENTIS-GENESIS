export async function handler(event: any): Promise<any> {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: true, message: "Verification placeholder" }),
  };
}
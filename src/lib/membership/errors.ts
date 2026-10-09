export class MemberError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

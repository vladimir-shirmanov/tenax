namespace Tenax.Web.Errors;

public sealed record ApiErrorEnvelope(string Code, string Message, string TraceId, IDictionary<string, string[]>? Errors = null);

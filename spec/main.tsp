import "@typespec/http";
import "@typespec/openapi";

using Http;

@service(#{ title: "Call booking API" })
namespace CallBooking;

/** A call format the owner offers. */
model EventType {
  /** Short identifier set by the owner, used in URLs. */
  @pattern("^[a-z0-9]+(-[a-z0-9]+)*$")
  @maxLength(64)
  id: string;

  /** No surrounding whitespace, no line breaks. */
  @pattern("^\\S(.*\\S)?$")
  @minLength(1)
  @maxLength(100)
  title: string;

  @maxLength(500)
  description: string;

  /** Multiple of 15, from 15 to 540. */
  @minValue(15)
  @maxValue(540)
  @OpenAPI.extension("multipleOf", 15)
  durationMinutes: int32;
}

/** A free interval `[start, end)` of an event type's duration; computed, not stored. */
model Slot {
  start: utcDateTime;
  end: utcDateTime;
}

/** What a guest sends to book a slot. */
model BookingRequest {
  eventTypeId: string;

  /** Must be a start of a slot of the event type. */
  start: utcDateTime;

  /** No surrounding whitespace, no line breaks. */
  @pattern("^\\S(.*\\S)?$")
  @minLength(1)
  @maxLength(100)
  guestName: string;

  @pattern("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
  @maxLength(254)
  guestEmail: string;
}

/** An interval `[start, end)` a guest took for an event type. */
model Booking {
  @format("uuid") id: string;
  ...BookingRequest;

  /** `start` plus the event type's duration. */
  end: utcDateTime;
}

union ApiErrorCode {
  "VALIDATION_ERROR",
  "INVALID_START",
  "EVENT_TYPE_NOT_FOUND",
  "EVENT_TYPE_EXISTS",
  "BOOKING_CONFLICT",
}

@error
model ApiError {
  code: ApiErrorCode;

  /** English text for developers; the UI builds user text from `code`. */
  message: string;
}

@route("/api/event-types")
@tag("EventTypes")
interface EventTypes {
  /** All event types sorted by title. */
  @get @OpenAPI.operationId("listEventTypes") list(): EventType[];

  /** Creates an event type; `id` must be unused. */
  @post
  @OpenAPI.operationId("createEventType")
  create(@body eventType: EventType):
    | {
        @statusCode statusCode: 201;
        @body body: EventType;
      }
    | {
        @statusCode statusCode: 400;
        @body body: ApiError;
      }
    | {
        @statusCode statusCode: 409;
        @body body: ApiError;
      };

  /** Free slots of the booking window sorted by start. */
  @get
  @route("{id}/slots")
  @OpenAPI.operationId("listSlots")
  listSlots(@path id: string):
    | Slot[]
    | {
        @statusCode statusCode: 404;
        @body body: ApiError;
      };
}

@route("/api/bookings")
@tag("Bookings")
interface Bookings {
  /** Books a free slot; no overlap with any booking of any event type. */
  @post
  @OpenAPI.operationId("createBooking")
  create(@body booking: BookingRequest):
    | {
        @statusCode statusCode: 201;
        @body body: Booking;
      }
    | {
        @statusCode statusCode: 400;
        @body body: ApiError;
      }
    | {
        @statusCode statusCode: 404;
        @body body: ApiError;
      }
    | {
        @statusCode statusCode: 409;
        @body body: ApiError;
      };
}

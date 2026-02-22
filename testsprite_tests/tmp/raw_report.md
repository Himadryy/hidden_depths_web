
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** HiddenDepths-Website
- **Date:** 2026-02-20
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 create_booking_restricted_to_sundays_and_mondays
- **Test Code:** [TC001_create_booking_restricted_to_sundays_and_mondays.py](./TC001_create_booking_restricted_to_sundays_and_mondays.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 77, in <module>
  File "<string>", line 72, in test_create_booking_restricted_to_sundays_and_mondays
AssertionError: Expected booking to succeed on 2026-02-22 (weekday 6), got status 401.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28ee079f-c7f6-4502-808f-3df31d847968/4afd687c-5988-4941-9f91-2952ade9b726
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 prevent_double_booking_for_same_slot
- **Test Code:** [TC002_prevent_double_booking_for_same_slot.py](./TC002_prevent_double_booking_for_same_slot.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 74, in <module>
  File "<string>", line 61, in test_prevent_double_booking_for_same_slot
AssertionError: Expected exactly one successful booking, got 0

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28ee079f-c7f6-4502-808f-3df31d847968/a274474d-7a3b-40a8-8979-d3e8161f958e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 successful_payment_processing_before_booking_confirmation
- **Test Code:** [TC003_successful_payment_processing_before_booking_confirmation.py](./TC003_successful_payment_processing_before_booking_confirmation.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 44, in test_successful_payment_processing_before_booking_confirmation
  File "/var/task/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url: http://localhost:8081/api/bookings

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 65, in <module>
  File "<string>", line 50, in test_successful_payment_processing_before_booking_confirmation
AssertionError: Booking creation failed: 401 Client Error: Unauthorized for url: http://localhost:8081/api/bookings

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28ee079f-c7f6-4502-808f-3df31d847968/df2d4a8d-88aa-4692-b564-876335188119
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 automated_email_confirmation_after_successful_booking
- **Test Code:** [TC004_automated_email_confirmation_after_successful_booking.py](./TC004_automated_email_confirmation_after_successful_booking.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/urllib3/connectionpool.py", line 787, in urlopen
    response = self._make_request(
               ^^^^^^^^^^^^^^^^^^^
  File "/var/task/urllib3/connectionpool.py", line 534, in _make_request
    response = conn.getresponse()
               ^^^^^^^^^^^^^^^^^^
  File "/var/task/urllib3/connection.py", line 565, in getresponse
    httplib_response = super().getresponse()
                       ^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/http/client.py", line 1430, in getresponse
    response.begin()
  File "/var/lang/lib/python3.12/http/client.py", line 331, in begin
    version, status, reason = self._read_status()
                              ^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/http/client.py", line 292, in _read_status
    line = str(self.fp.readline(_MAXLINE + 1), "iso-8859-1")
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/lang/lib/python3.12/socket.py", line 720, in readinto
    return self._sock.recv_into(b)
           ^^^^^^^^^^^^^^^^^^^^^^^
ConnectionResetError: [Errno 104] Connection reset by peer

The above exception was the direct cause of the following exception:

urllib3.exceptions.ProxyError: ('Unable to connect to proxy', ConnectionResetError(104, 'Connection reset by peer'))

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/var/task/requests/adapters.py", line 667, in send
    resp = conn.urlopen(
           ^^^^^^^^^^^^^
  File "/var/task/urllib3/connectionpool.py", line 841, in urlopen
    retries = retries.increment(
              ^^^^^^^^^^^^^^^^^^
  File "/var/task/urllib3/util/retry.py", line 519, in increment
    raise MaxRetryError(_pool, url, reason) from reason  # type: ignore[arg-type]
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
urllib3.exceptions.MaxRetryError: HTTPConnectionPool(host='tun.testsprite.com', port=8080): Max retries exceeded with url: http://localhost:8081/api/bookings (Caused by ProxyError('Unable to connect to proxy', ConnectionResetError(104, 'Connection reset by peer')))

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 70, in <module>
  File "<string>", line 40, in test_automated_email_confirmation_after_successful_booking
  File "/var/task/requests/api.py", line 115, in post
    return request("post", url, data=data, json=json, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/task/requests/api.py", line 59, in request
    return session.request(method=method, url=url, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/task/requests/sessions.py", line 589, in request
    resp = self.send(prep, **send_kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/task/requests/sessions.py", line 703, in send
    r = adapter.send(request, **kwargs)
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/var/task/requests/adapters.py", line 694, in send
    raise ProxyError(e, request=request)
requests.exceptions.ProxyError: HTTPConnectionPool(host='tun.testsprite.com', port=8080): Max retries exceeded with url: http://localhost:8081/api/bookings (Caused by ProxyError('Unable to connect to proxy', ConnectionResetError(104, 'Connection reset by peer')))

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28ee079f-c7f6-4502-808f-3df31d847968/37bc50b1-baac-4bfd-9dfa-da581b5728f0
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 jwt_authentication_for_admin_routes
- **Test Code:** [TC005_jwt_authentication_for_admin_routes.py](./TC005_jwt_authentication_for_admin_routes.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 67, in <module>
  File "<string>", line 62, in test_jwt_authentication_for_admin_routes
AssertionError: Expected 200 for valid token on /api/admin/bookings, got 401

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28ee079f-c7f6-4502-808f-3df31d847968/42e96334-241b-4d70-98a0-e011e12ed81d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 razorpay_order_creation_api_functionality
- **Test Code:** [TC006_razorpay_order_creation_api_functionality.py](./TC006_razorpay_order_creation_api_functionality.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 55, in <module>
  File "<string>", line 30, in test_razorpay_order_creation_api_functionality
AssertionError: Unexpected status code: 404, response: 404 page not found


- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/28ee079f-c7f6-4502-808f-3df31d847968/c31cd892-8f30-4717-a6d5-e6ae43ae344b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---
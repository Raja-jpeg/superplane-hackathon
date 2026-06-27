from fastapi import APIRouter

router = APIRouter()

# Before: GET /users/{id}
# After:  GET /accounts/{account_id}
@router.get("/accounts/{account_id}")
def get_account(account_id: str):
    # was: email field; renamed to email_address (breaking)
    return {"id": account_id, "email_address": "user@example.com"}

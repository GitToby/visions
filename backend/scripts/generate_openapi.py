from pathlib import Path

from fastapi.responses import JSONResponse

from visions.main import app

OPENAPI_FILE = Path(__file__).parent.parent.parent / "resources" / "openapi.json"

if __name__ == "__main__":
    oapi = app.openapi()
    json_ = JSONResponse(oapi)
    with OPENAPI_FILE.open("wb") as f:
        f.write(json_.body)

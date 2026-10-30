import aioboto3
from intervia.core.config import settings

class S3MediaStore:
    """Handles uploading offline video chunks to S3 (MinIO) without blocking the server."""

    def __init__(self) -> None:
        self.session = aioboto3.Session()
        # Securely pulling credentials from the .env file via Pydantic settings
        self.bucket = settings.S3_BUCKET_NAME
        self.endpoint_url = settings.S3_ENDPOINT_URL
        self.access_key = settings.S3_ACCESS_KEY
        self.secret_key = settings.S3_SECRET_KEY
        self.region = settings.S3_REGION

    async def upload_video_chunk(self, session_id: str, seq: int, file_bytes: bytes) -> str:
        """Uploads a 5-second offline WebM chunk to S3 and returns the file path."""
        object_key = f"interviews/{session_id}/offline_chunks/chunk_{seq}.webm"
        
        # 'async with' ensures the upload happens without pausing the rest of the API
        async with self.session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
        ) as s3_client:
            await s3_client.put_object(
                Bucket=self.bucket, 
                Key=object_key, 
                Body=file_bytes, 
                ContentType="video/webm"
            )
            return object_key


s3_store = S3MediaStore()
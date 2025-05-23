FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Default environment variables
ENV PORT=8000
ENV BACKEND_API_URL=http://backend:5000/api
ENV API_TOKEN=""

EXPOSE 8000

CMD ["python", "workout_mcp_server.py"]

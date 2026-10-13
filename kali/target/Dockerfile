FROM python:3.12-alpine
COPY target.py /target.py
USER 65534:65534
ENTRYPOINT ["python3", "/target.py"]

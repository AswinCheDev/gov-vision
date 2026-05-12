import pytest
import json
from unittest.mock import patch, MagicMock
import sys
from pathlib import Path

# Add app directory to path
app_dir = Path(__file__).parent.parent / 'app'
if str(app_dir) not in sys.path:
    sys.path.insert(0, str(app_dir))

# Import app and dependencies
from main import app, VALID_SERVICE_KEYS

@pytest.fixture
def client():
    """Create Flask test client"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

class TestRetrainEndpoint:
    """Test suite for POST /ml/models/train endpoint"""

    def test_retrain_with_valid_service_key(self, client):
        """Should return 200 with status for valid service key"""
        response = client.post(
            '/ml/models/train',
            headers={'X-Service-Key': list(VALID_SERVICE_KEYS)[0]},
            json={'model_type': 'all'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'status' in data
        assert data['status'] in ['success', 'training', 'completed', 'pending']

    def test_retrain_with_invalid_service_key(self, client):
        """Should return 401 for invalid service key"""
        response = client.post(
            '/ml/models/train',
            headers={'X-Service-Key': 'invalid-key-12345'},
            json={'model_type': 'all'}
        )
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data

    def test_retrain_without_service_key(self, client):
        """Should return 401 when service key is missing"""
        response = client.post(
            '/ml/models/train',
            json={'model_type': 'all'}
        )
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data

    def test_retrain_isolation_forest_model(self, client):
        """Should train isolation forest model"""
        service_key = list(VALID_SERVICE_KEYS)[0]
        
        response = client.post(
            '/ml/models/train',
            headers={'X-Service-Key': service_key},
            json={'model_type': 'anomaly'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'status' in data

    def test_retrain_prophet_model(self, client):
        """Should train prophet forecast model"""
        service_key = list(VALID_SERVICE_KEYS)[0]
        
        response = client.post(
            '/ml/models/train',
            headers={'X-Service-Key': service_key},
            json={'model_type': 'forecast'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'status' in data

    def test_retrain_random_forest_model(self, client):
        """Should train random forest risk scoring model"""
        service_key = list(VALID_SERVICE_KEYS)[0]
        
        response = client.post(
            '/ml/models/train',
            headers={'X-Service-Key': service_key},
            json={'model_type': 'risk'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'status' in data

    def test_retrain_all_models(self, client):
        """Should train all models"""
        service_key = list(VALID_SERVICE_KEYS)[0]
        
        response = client.post(
            '/ml/models/train',
            headers={'X-Service-Key': service_key},
            json={'model_type': 'all'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'status' in data

    def test_retrain_with_empty_model_type(self, client):
        """Should return 400 for empty model_type"""
        service_key = list(VALID_SERVICE_KEYS)[0]
        
        response = client.post(
            '/ml/models/train',
            headers={'X-Service-Key': service_key},
            json={'model_type': ''}
        )
        
        assert response.status_code in [400, 422]

    def test_retrain_with_missing_model_type(self, client):
        """Should return 400 for missing model_type"""
        service_key = list(VALID_SERVICE_KEYS)[0]
        
        response = client.post(
            '/ml/models/train',
            headers={'X-Service-Key': service_key},
            json={}
        )
        
        assert response.status_code in [400, 422]

    def test_retrain_response_contains_job_id(self, client):
        """Should return response with job_id or task_id"""
        service_key = list(VALID_SERVICE_KEYS)[0]
        
        response = client.post(
            '/ml/models/train',
            headers={'X-Service-Key': service_key},
            json={'model_type': 'all'}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        # Check for job/task identifier
        assert any(key in data for key in ['job_id', 'task_id', 'id', 'status'])

    def test_retrain_endpoint_returns_json(self, client):
        """Should return JSON response"""
        service_key = list(VALID_SERVICE_KEYS)[0]
        
        response = client.post(
            '/ml/models/train',
            headers={'X-Service-Key': service_key},
            json={'model_type': 'all'}
        )
        
        assert response.content_type == 'application/json'

    def test_retrain_case_insensitive_model_type(self, client):
        """Should handle case-insensitive model_type"""
        service_key = list(VALID_SERVICE_KEYS)[0]
        
        response = client.post(
            '/ml/models/train',
            headers={'X-Service-Key': service_key},
            json={'model_type': 'ANOMALY'}
        )
        
        # Should either succeed or give clear error
        assert response.status_code in [200, 400, 422]

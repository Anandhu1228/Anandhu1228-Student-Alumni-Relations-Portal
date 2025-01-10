import json
from gensim.models.doc2vec import Doc2Vec, TaggedDocument
import nltk
from nltk.tokenize import word_tokenize
import re
import os
import math

# Download NLTK tokenizer data if not already downloaded
nltk.download('punkt')

# Define the path for the script and training data
script_dir = os.path.dirname(os.path.abspath(__file__))
training_data_path = os.path.join(script_dir, 'training_doc2vec_job_data.json')
model_save_path = os.path.join(script_dir, 'doc2vec_job_rec_model')

# Load training data
with open(training_data_path, 'r') as file:
    data = json.load(file)

# Function to clean the text
def clean_text(text):
    """Cleans the text by removing special characters, extra spaces, and digits."""
    # Replace newlines, carriage returns, and tabs with spaces
    text = re.sub(r'[\n\r\t]+', ' ', text)
    # Remove all punctuation and special characters (except for essential ones)
    text = re.sub(r'[^\w\s]', '', text)
    # Replace multiple spaces with a single space
    text = re.sub(r'\s+', ' ', text)
    # Remove digits
    text = re.sub(r'\d+', '', text)
    # Trim leading and trailing spaces
    text = text.strip()
    return text

# Prepare TaggedDocuments
tagged_data = []
tag_map = {}

for item in data:
    userId = item.get('userId', '')
    branch = item.get('branch', '')
    experiences = item.get('experiences', [])
    location = item.get('location', '')
    interests = item.get('interests', [])

    # Combine fields into a single text string
    text_parts = [branch, location] + interests + experiences
    text = ' '.join(part for part in text_parts if part)
    text = clean_text(text)  # Clean the text

    # Tokenize the cleaned text
    words = word_tokenize(text.lower())
    tag = str(userId)

    if tag in tag_map:
        # Update existing entry
        idx = tag_map[tag]
        tagged_data[idx].words.extend(words)
    else:
        # Add new entry
        tag_map[tag] = len(tagged_data)
        tagged_data.append(TaggedDocument(words=words, tags=[tag]))

# Initialize or load the Doc2Vec model
if os.path.exists(model_save_path):
    model = Doc2Vec.load(model_save_path)
    print('Loaded existing Doc2Vec model.')
else:
    # Initialize the Doc2Vec model with more workers for faster training
    model = Doc2Vec(vector_size=100,  # Keep vector size the same
                    window=2,  # Adjust window size to match the internship model
                    min_count=1,  # Keep min_count the same
                    workers=8,  # Increase number of workers for faster training
                    epochs=20)  # Keep epochs the same
    model.build_vocab(tagged_data)
    print('Initialized new Doc2Vec model.')

# Batch training
batch_size = 30  # Adjust batch size as needed
num_batches = math.ceil(len(tagged_data) / batch_size)

for i in range(num_batches):
    start_idx = i * batch_size
    end_idx = min(start_idx + batch_size, len(tagged_data))
    batch_data = tagged_data[start_idx:end_idx]
    model.train(batch_data, total_examples=len(batch_data), epochs=model.epochs)
    print(f'Trained batch {i+1}/{num_batches}')

# Save the trained model
model.save(model_save_path)
print('Doc2Vec Job recommendation model trained and saved successfully.')
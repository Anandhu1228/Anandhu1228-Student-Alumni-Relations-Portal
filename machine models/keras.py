import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences

# Load and preprocess training data
with open('training_doc2vec_job_data.json', 'r') as file:
    data = json.load(file)

texts = [item['text'] for item in data]
labels = [item['userId'] for item in data]

tokenizer = Tokenizer()
tokenizer.fit_on_texts(texts)
vocab_size = len(tokenizer.word_index) + 1

sequences = tokenizer.texts_to_sequences(texts)
max_seq_length = max([len(seq) for seq in sequences])

padded_sequences = pad_sequences(sequences, maxlen=max_seq_length, padding='post')

# Define Siamese LSTM model
input_layer = tf.keras.Input(shape=(max_seq_length,))
embedding_layer = tf.keras.layers.Embedding(input_dim=vocab_size, output_dim=100)(input_layer)
lstm_layer = tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(64))(embedding_layer)
output_layer = tf.keras.layers.Dense(128, activation='relu')(lstm_layer)

siamese_model = tf.keras.Model(inputs=input_layer, outputs=output_layer)

# Compile the model
siamese_model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

# Train the Siamese LSTM model
siamese_model.fit(x=padded_sequences, y=np.array(labels), epochs=20, batch_size=32)

# Save the model
siamese_model.save("siamese_lstm_model")

print('Siamese LSTM model trained and saved successfully.')

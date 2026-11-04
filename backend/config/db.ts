import mongoose from "mongoose";
import "colors";

const ConnectDb = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    const connect = await mongoose.connect(mongoUri);
    console.log(
      `✅✅✅ Application is connected with ${connect.connection.host}`.bgGreen.underline
    );
  } catch (error: any) {
    console.log(
      `❌❌❌ Unable to connect with database : ${error.message}`.bgRed.underline
    );
    process.exit(1);
  }
};

export default ConnectDb;


import batman from "../assets/avatars/batman.png";
import guy from "../assets/avatars/guy.png";
import blackGirl from "../assets/avatars/empathy.png";
import boy from "../assets/avatars/boy.png";
import man from "../assets/avatars/man.png";
import beardy from "../assets/avatars/beardy.png";
import user from "../assets/avatars/user.png";
import avatar from "../assets/avatars/avatar.png";
import woman from "../assets/avatars/woman.png";

export const getRandomAvatar = () => {
  const arrOfAvatars = [
    batman,
    guy,
    blackGirl,
    boy,
    man,
    beardy,
    user,
    avatar,
    woman,
  ];
  const randomIndex = Math.floor(Math.random() * arrOfAvatars.length);
  return arrOfAvatars[randomIndex];
};

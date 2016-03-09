

# for controller tests
def login_as_admin
  @request.env["devise.mapping"] = Devise.mappings[:admin]
  sign_in FactoryGirl.create(:admin_user)
end

def set_weak_password(user)
  weak_password = "12345678"
  user.password = weak_password
  user.password_confirmation = weak_password
  result = user.save
end

def set_strong_password(user)
  weak_password = "strong passwords defeat lobsters covering wealth"
  user.password = weak_password
  user.password_confirmation = weak_password
  result = user.save
end


# for request tests
def login(user)
  login_path = '/login'
  post login_path, {
    user: {
      :email => user.email,
      :password => "strong passwords defeat lobsters covering wealth" }
  }
end

# requires capybara
def sign_in_user(user)
  visit '/login'
  fill_in "Email", with: user.email
  fill_in "Password", with: user.password
  click_button "Sign in"
end
